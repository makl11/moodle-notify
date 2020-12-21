import { readFileSync, writeFileSync } from "fs";
import { Builder, By, IWebDriverCookie, WebDriver } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";
import { createAuthMoodleClientWithCookies, getMoodleData } from "./MoodleAPI";

const DEBUG: boolean = JSON.parse(
	process.env["MOODLE_NOTIFY_DEBUG"]?.toLocaleLowerCase() ?? "false"
);
const USERNAME: string = process.env["MOODLE_NOTIFY_USERNAME"] ?? "";
const PASSWORD: string = process.env["MOODLE_NOTIFY_PASSWORD"] ?? "";

async function authenticateDriver(
	driver: WebDriver,
	username: string,
	password: string
): Promise<WebDriver> {
	await driver.get("https://elearning.hs-ruhrwest.de");
	await driver.findElement(By.css('center > input[value="Login"]')).click();
	await driver.findElement(By.id("username")).sendKeys(username);
	await driver.findElement(By.id("password")).sendKeys(password);
	await driver.findElement(By.css('button[type="submit"]')).click();
	await driver.get("https://elearning.hs-ruhrwest.de/my/");
	return driver;
}

async function getAuthCookies(
	username: string,
	password: string
): Promise<Array<IWebDriverCookie>> {
	let seleniumDriver: WebDriver | undefined;
	try {
		seleniumDriver = await new Builder()
			.forBrowser("chrome")
			.setChromeOptions(
				DEBUG
					? new Options().addArguments(
							"--auto-open-devtools-for-tabs"
					  )
					: new Options().headless()
			)
			.build();
		await seleniumDriver.manage().window().maximize();
		seleniumDriver = await authenticateDriver(
			seleniumDriver,
			username,
			password
		);
		const cookies = seleniumDriver.manage().getCookies();
		return cookies;
	} catch (error) {
		throw error;
	} finally {
		seleniumDriver?.quit();
	}
}
function createHeaderCookieString(cookies: Array<IWebDriverCookie>): string {
	return cookies.reduce(
		(cookieString: string, cookie: IWebDriverCookie) =>
			cookieString.concat(`${cookie.name}=${cookie.value}; `),
		""
	);
}

function diffCourses(oldCourse: Course, newCourse: Course) {
	const extractHashAndId = ({ id, hash }: { id: number; hash: string }) => ({
		id,
		hash,
	});
	const oldSections = oldCourse.sections.map(extractHashAndId);
	const newSections = newCourse.sections.map(extractHashAndId);

	const changedSections = newSections.filter(
		({ hash, id }) => oldSections.find((oS) => oS.id === id)?.hash !== hash
	);
	return {
		id: newCourse.id,
		title: newCourse.title,
		changedSections,
	};
}

function getChangedCourseSection(
	dataset: MoodleCourses,
	courseId: number,
	sectionId: number
) {
	return dataset
		.find((course) => courseId === course.id)
		?.sections.find((section) => section.id === sectionId);
}

(async () => {
	const cookies = createHeaderCookieString(
		await getAuthCookies(USERNAME, PASSWORD)
	);
	const moodleClient = await createAuthMoodleClientWithCookies(cookies);

	const moodleData = await getMoodleData(moodleClient);

	const oldMoodleData: MoodleCourses = JSON.parse(
		readFileSync(`./data/data.json`).toString()
	);

	const changedCourses = oldMoodleData
		.map((course: Course) => {
			const updatedVersion =
				moodleData.find((c: Course) => c.id === course.id) ?? course;
			return diffCourses(course, updatedVersion);
		})
		.filter((course) => !!course.changedSections.length)
		.map((course) => ({
			...course,
			changedSections: course.changedSections.map((section) =>
				getChangedCourseSection(moodleData, course.id, section.id)
			),
		}));

	// TODO notify about changes

	writeFileSync(`./data/data.json`, JSON.stringify(moodleData));

	moodleData.forEach((course) => {
		writeFileSync(
			`./data/data-course-${course.id}.json`,
			JSON.stringify(course)
		);
	});
})();
