import {
	MoodleCourseSection,
	MoodleCourseContent,
	MoodleSectionModule,
	MoodleToken,
	MoodleAPI,
	MoodleCourse,
	MoodleSiteConfiguration,
	MoodleUserConfiguration,
} from "./interfaces/MoodleAPI";
import MoodleClient from "./MoodleClient";
import {
	JsonFileMoodleClient,
	JsonMoodleAPI,
	MoodleJsonData,
} from "./JsonFileMoodleClient";
import { readFile, writeFile } from "fs/promises";
import TelegramBot from "node-telegram-bot-api";
import { exit } from "process";

const DEBUG: boolean = JSON.parse(
	process.env["MOODLE_NOTIFY_DEBUG"]?.toLocaleLowerCase() ?? "false"
);

const MOODLE_NOTIFY_SITEURL = process.env["MOODLE_NOTIFY_SITEURL"] ?? "";
const MOODLE_NOTIFY_SITEID = process.env["MOODLE_NOTIFY_SITEID"] ?? "";
const MOODLE_NOTIFY_TOKEN = process.env["MOODLE_NOTIFY_TOKEN"] ?? "";
const MOODLE_NOTIFY_PRIVATE_TOKEN =
	process.env["MOODLE_NOTIFY_PRIVATE_TOKEN"] ?? "";
const MOODLE_NOTIFY_ENCODED_TOKEN =
	process.env["MOODLE_NOTIFY_ENCODED_TOKEN"] ?? "";
const MOODLE_NOTIFY_TELEGRAM_TOKEN =
	process.env["MOODLE_NOTIFY_TELEGRAM_TOKEN"] ?? "";

if (
	MOODLE_NOTIFY_SITEURL &&
	!(
		(MOODLE_NOTIFY_SITEID && MOODLE_NOTIFY_TOKEN) ||
		MOODLE_NOTIFY_ENCODED_TOKEN
	) &&
	!MOODLE_NOTIFY_TELEGRAM_TOKEN
) {
	console.error(
		"Not enough parameters. Make sure you provide the sites url, a token ",
		"and site id or an encoded token for authentication as well as a token ",
		"for telegram to send out notifications with.\n"
	);
	DEBUG &&
		console.table({
			MOODLE_NOTIFY_SITEURL: process.env["MOODLE_NOTIFY_SITEURL"],
			MOODLE_NOTIFY_SITEID: process.env["MOODLE_NOTIFY_SITEID"],
			MOODLE_NOTIFY_TOKEN: process.env["MOODLE_NOTIFY_TOKEN"],
			MOODLE_NOTIFY_PRIVATE_TOKEN: process.env["MOODLE_NOTIFY_PRIVATE_TOKEN"],
			MOODLE_NOTIFY_ENCODED_TOKEN: process.env["MOODLE_NOTIFY_ENCODED_TOKEN"],
			MOODLE_NOTIFY_TELEGRAM_TOKEN: process.env["MOODLE_NOTIFY_TELEGRAM_TOKEN"],
		});
	exit(1);
}

function compareCourses(
	oldCourses: MoodleCourseContent[],
	newCourses: MoodleCourseContent[]
): {
	courseId: number;
	changedSections: { sectionId: number; changedModules: number[] }[];
}[] {
	return newCourses
		.map(({ id: courseId, sections }) => {
			const oldCourseContent = oldCourses.find(({ id }) => id === courseId);
			const changedSections = sections
				// Filter courses sections for some section[s] that changed
				.filter((newCourseSection) => {
					const oldCourseSection = oldCourseContent?.sections.find(
						({ id }) => id === newCourseSection.id
					);
					if (!oldCourseSection) return true;
					return !sectionsAreEqual(oldCourseSection, newCourseSection);
				})
				// Modify changed section[s] to only contain id and changed module[s]
				.map(({ id: sectionId, modules }) => {
					const oldCourseSection = oldCourseContent?.sections.find(
						({ id }) => id === sectionId
					);
					const changedModules = modules
						// Filter sections modules for some module[s] that changed
						.filter((newModule) => {
							const oldModule = oldCourseSection?.modules.find(
								(oldMod) => oldMod.id === newModule.id
							);
							if (!oldModule) return true;
							return !modulesAreEqual(oldModule, newModule);
						})
						// Reduce changed module[s] to id only
						.map((changedModule) => changedModule.id);
					return { sectionId, changedModules };
				});

			return { courseId, changedSections };
		})
		.filter(({ changedSections }) => changedSections.length > 0);
}

function sectionsAreEqual(
	oldSection: MoodleCourseSection,
	newSection: MoodleCourseSection
): boolean {
	return (
		oldSection.id === newSection.id &&
		oldSection.name === newSection.name &&
		oldSection.visible === newSection.visible &&
		oldSection.summary === newSection.summary &&
		oldSection.summaryformat === newSection.summaryformat &&
		oldSection.section === newSection.section &&
		oldSection.hiddenbynumsections === newSection.hiddenbynumsections &&
		oldSection.uservisible === newSection.uservisible &&
		sectionModulesAreEqual(oldSection.modules, newSection.modules)
	);
}

function sectionModulesAreEqual(
	oldSectionModules: MoodleSectionModule[],
	newSectionModules: MoodleSectionModule[]
): boolean {
	return newSectionModules.reduce(
		(equal: boolean, newModule: MoodleSectionModule): boolean => {
			const oldModule = oldSectionModules.find(({ id }) => id === newModule.id);
			if (!oldModule) return false;
			equal = equal && modulesAreEqual(oldModule, newModule);
			return equal;
		},
		true
	);
}

function modulesAreEqual(
	oldModule: MoodleSectionModule,
	newModule: MoodleSectionModule
): boolean {
	// if (newModule.id === 199805) return oldModule.url === newModule.url;
	return (
		oldModule.id === newModule.id &&
		(newModule?.url ? oldModule?.url === newModule?.url : true) &&
		oldModule.name === newModule.name &&
		oldModule.instance === newModule.instance &&
		oldModule.visible === newModule.visible &&
		oldModule.uservisible === newModule.uservisible &&
		oldModule.visibleoncoursepage === newModule.visibleoncoursepage &&
		oldModule.modicon === newModule.modicon &&
		oldModule.modname === newModule.modname &&
		oldModule.modplural === newModule.modplural &&
		oldModule.indent === newModule.indent &&
		// Fix for that one fucking course that keeps changing minimally
		(newModule?.description && newModule.id !== 173573
			? oldModule?.description === newModule?.description
			: true)
	);
}

async function sendTelegramNotification(
	telegramBot: TelegramBot,
	changedCourses: any,
	msg?: TelegramBot.Message
) {
	if (!changedCourses.length) {
		msg && telegramBot.sendMessage(msg.chat.id, "No changed courses found");
		console.log(
			`[MOODLE-NOTIFY] (${new Date().toLocaleString()}): No updates found!`
		);
		return;
	}

	const allUserIds: Array<number> = JSON.parse(
		(await readFile("./data/users.json").catch()).toString()
	);

	allUserIds.forEach(async (id) => {
		await telegramBot.sendMessage(
			id,
			changedCourses.reduce(
				(out: string, course: any) =>
					out.concat(
						`[${course.fullname}](https\:\/\/elearning\.hs\-ruhrwest\.de\/course\/view\.php?id=${course.id}\#section\-${course.changedSections[0]?.section})\n`
					),
				"Die folgenden Kurse wurden aktualisiert:\n"
			),
			{
				parse_mode: "Markdown",
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "Moodle Dashboard öffnen",
								url: "https://elearning.hs-ruhrwest.de/my/",
							},
						],
					],
				},
			}
		);
	});
	return console.log(
		`[MOODLE-NOTIFY] (${new Date().toLocaleString()}): Updates found and notifications sent`
	);
}

const storeData = async (
	siteConfig: MoodleSiteConfiguration | undefined,
	userConfig: MoodleUserConfiguration | undefined,
	userCourses: MoodleCourse[],
	userCoursesContents: MoodleCourseContent[]
) =>
	// Write new data to disk
	await writeFile(
		"./data/data.json",
		JSON.stringify({ siteConfig, userConfig, userCourses, userCoursesContents })
	);

export const checkForChangedCourses = async (
	msg?: TelegramBot.Message,
	telegramBot?: TelegramBot
) => {
	try {
		console.log(
			`[MOODLE-NOTIFY] (${new Date().toLocaleString()}): Checking for updates...`
		);
		let token: MoodleToken | undefined = undefined;

		const jsonClient = new JsonFileMoodleClient("./data/data.json");
		const { isFirstRun } = jsonClient;

		if (MOODLE_NOTIFY_ENCODED_TOKEN) {
			token = MoodleClient.parseToken(MOODLE_NOTIFY_ENCODED_TOKEN);
		}

		const client = new MoodleClient(
			MOODLE_NOTIFY_SITEURL,
			token ?? {
				siteId: MOODLE_NOTIFY_SITEID,
				token: MOODLE_NOTIFY_TOKEN,
				privateToken: MOODLE_NOTIFY_PRIVATE_TOKEN,
			}
		);
		// const siteConfig = await client.getSiteConfiguration();

		const userConfig = await client.getUserConfiguration();

		const userCourses = await client.getAllCoursesByUserId(userConfig.userid);

		const userCoursesContents = await Promise.all(
			userCourses.map(({ id }) => client.getCourseContentById(id))
		);

		if (isFirstRun) {
			jsonClient.isFirstRun = false;
			return await storeData(
				undefined,
				userConfig,
				userCourses,
				userCoursesContents
			);
		}

		// const localSiteConfig = await jsonClient.getSiteConfiguration()

		// const localUserConfig = await jsonClient.getUserConfiguration();

		const localUserCourses = await jsonClient.getAllCoursesByUserId(
			userConfig.userid
		);

		const localUserCoursesContents = await Promise.all(
			localUserCourses.map(({ id }) => jsonClient.getCourseContentById(id))
		);

		const changedCourses = compareCourses(
			localUserCoursesContents,
			userCoursesContents
		);

		await storeData(undefined, userConfig, userCourses, userCoursesContents);

		const changedCoursesContent = await Promise.all(
			changedCourses.map(async ({ courseId, changedSections }) => {
				const courseData = await client.getCourseById(courseId);
				const changedSectionData = await Promise.all(
					changedSections.map(({ sectionId }) =>
						client.getCourseSectionById(courseId, sectionId)
					)
				);
				return { ...courseData, changedSections: changedSectionData };
			})
		);

		telegramBot =
			telegramBot ?? MOODLE_NOTIFY_TELEGRAM_TOKEN
				? new TelegramBot(MOODLE_NOTIFY_TELEGRAM_TOKEN)
				: undefined;
		if (telegramBot)
			await sendTelegramNotification(telegramBot, changedCoursesContent, msg);
	} catch (error) {
		console.error(error);
	}
};
checkForChangedCourses();
