import {
	MoodleAPI,
	MoodleCourse,
	MoodleCourseContent,
	MoodleCourseSection,
	MoodleSiteConfiguration,
	MoodleToken,
	MoodleUserConfiguration,
} from "./interfaces/MoodleAPI";
import { readFile, access } from "fs/promises";
import { accessSync, closeSync, constants, openSync, writeFileSync } from "fs";

export interface MoodleJsonData {
	siteConfig: MoodleSiteConfiguration;
	userConfig: MoodleUserConfiguration;
	userCourses: MoodleCourse[];
	userCoursesContents: MoodleCourseContent[];
}

export interface JsonMoodleAPI extends MoodleAPI {
	isFirstRun: boolean;
}

export class JsonFileMoodleClient implements JsonMoodleAPI {
	constructor(filePath: string) {
		this.filePath = filePath;
		try {
			accessSync(filePath, constants.W_OK);
		} catch (error) {
			if (error.code === "ENOENT") {
				this.isFirstRun = true;
			} else throw error;
		}
	}

	private filePath: string;

	public isFirstRun = false;

	private async loadJsonData(): Promise<MoodleJsonData> {
		try {
			const fileContents = await readFile(this.filePath);
			return JSON.parse(fileContents.toString());
		} catch (error) {
			throw error;
		}
	}

	public getSiteConfiguration = async (): Promise<MoodleSiteConfiguration> => {
		const jsonData = await this.loadJsonData();
		return jsonData.siteConfig;
	};

	public getUserConfiguration = async (): Promise<MoodleUserConfiguration> => {
		const jsonData = await this.loadJsonData();
		return jsonData.userConfig;
	};

	public getAllCoursesByUserId = async (
		userId: number
	): Promise<MoodleCourse[]> => {
		const jsonData = await this.loadJsonData();
		return jsonData.userCourses;
	};

	public getCourseById = async (courseId: number): Promise<MoodleCourse> => {
		const { userCourses } = await this.loadJsonData();
		const course = userCourses.find(({ id }) => id === courseId);
		if (!course) throw Error(`Course with id: ${courseId} not found!`);
		return course;
	};

	public getCourseContentById = async (
		courseId: number
	): Promise<MoodleCourseContent> => {
		const jsonData = await this.loadJsonData();
		const courseContent = jsonData.userCoursesContents.find(
			({ id }) => id == courseId
		);
		if (!courseContent)
			throw Error(`Content for course with id: ${courseId} not found!`);
		else return courseContent;
	};

	public getCourseSectionById = async (
		courseId: number,
		sectionId: number
	): Promise<MoodleCourseSection> => {
		const { userCoursesContents } = await this.loadJsonData();
		const course = userCoursesContents.find(({ id }) => id === courseId);
		const section = course?.sections.find(({ id }) => id === sectionId);
		if (!section)
			throw Error(`Content for section with id: ${sectionId} not found!`);
		return section;
	};
}
