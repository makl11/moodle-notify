import Axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { HTMLElement, parse } from "node-html-parser";
import { Builder, By, IWebDriverCookie, WebDriver } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";

const DEBUG: boolean = JSON.parse(
	process.env["MOODLE_NOTIFY_DEBUG"]?.toLocaleLowerCase() ?? "false"
);
const USERNAME: string = process.env["MOODLE_NOTIFY_USERNAME"] ?? "";
const PASSWORD: string = process.env["MOODLE_NOTIFY_PASSWORD"] ?? "";

enum AvailabilityStatus {
	NOT_AVAILABLE,
	AVAILABLE,
	PARTIAL,
}

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

async function createAuthMoodleClient(
	username: string,
	password: string
): Promise<any> {
	const cookies = await getAuthCookies(username, password);

	const authenticatedMoodleClient = Axios.create({
		baseURL: "https://elearning.hs-ruhrwest.de/",
		withCredentials: true,
		headers: {
			Cookie: createHeaderCookieString(cookies),
		},
	});
	return {
		...authenticatedMoodleClient,
		async get(url: string, config?: AxiosRequestConfig): Promise<unknown> {
			return await (await authenticatedMoodleClient.get(url, config))
				.data;
		},
	};
}

async function getCourseIds(
	moodleClient: AxiosInstance
): Promise<Array<number>> {
	const document = parse(
		await moodleClient.get("/my/index.php?coc-manage=1")
	);
	const courseIds = document
		.querySelectorAll("#coc-courselist .coc-course")
		.map((elem: HTMLElement) => elem.id)
		.map((idAsString: string) =>
			parseInt(idAsString.replace(/^coc-course-(\d+)$/, "$1"))
		);
	return courseIds;
}

async function getCourseData(
	moodleClient: AxiosInstance,
	id: number
): Promise<Course> {
	const document = parse(await moodleClient.get(`/course/view.php?id=${id}`));
	const title = document.querySelector(".page-header-headings").innerText;
	const sections = document
		.querySelectorAll(".section.main")
		.map(getSectionData);
	return {
		id,
		title,
		sections,
	};
}

function getSectionAvailability(section: HTMLElement): AvailabilityStatus {
	const container = section.querySelector(".content .section_availability");
	if (container.childNodes.length === 0) return AvailabilityStatus.AVAILABLE;
	const availabilityInfo = container
		.querySelector(".availabilityinfo")
		.classNames.filter((cN) => cN !== "availabilityinfo");
	if (availabilityInfo.includes("isrestricted"))
		return AvailabilityStatus.PARTIAL;
	if (availabilityInfo.includes("ishidden"))
		return AvailabilityStatus.NOT_AVAILABLE;
	console.error("UNHADNLED AVAILABLITY", availabilityInfo);
	return AvailabilityStatus.AVAILABLE;
}

function getSectionData(section: HTMLElement): CourseSection {
	const id = parseInt(section.id.replace(/^section-(\d+)$/, "$1"));
	const title = section.querySelector(".content .sectionname").text;
	const available = getSectionAvailability(section);
	const summaryString = section.querySelector(".content .summary")?.innerHTML;
	const summary = summaryString?.length > 0 ? summaryString : undefined;
	const content = section.querySelector(".content").innerHTML;
	return {
		id,
		title,
		available,
		summary,
		content,
	};
}

async function getMoodleData() {
	const moodleClient = await createAuthMoodleClient(USERNAME, PASSWORD);
	const courseIds = await getCourseIds(moodleClient);
	const allCourseData: MoodleCourses = await Promise.all(
		courseIds.map((id) => getCourseData(moodleClient, id))
	);
	return allCourseData;
}

getMoodleData().then((moodleData) => {
	moodleData.forEach((course) => {
		require("fs").writeFileSync(
			`./data/data-course-${course.id}.json`,
			JSON.stringify(course)
		);
	});
});
