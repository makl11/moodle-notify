import {
	MoodleAPI,
	MoodleCourse,
	MoodleCourseContent,
	MoodleCourseSection,
	MoodleSiteConfiguration,
	MoodleSiteConfigurationResponse,
	MoodleToken,
	MoodleUserConfiguration,
} from "./interfaces/MoodleAPI";

import Axios, { AxiosInstance, AxiosResponse } from "axios";

import FormData from "form-data";

export default class MoodleClient implements MoodleAPI {
	constructor(siteURL: string, token: MoodleToken) {
		this.token = token;
		this.axios = Axios.create({
			baseURL: `${this.removeTrailingSlash(siteURL)}`,
			params: { moodlewsrestformat: "json" },
		});
	}

	public static parseToken = (encodedToken: string): MoodleToken => {
		const decodedToken = Buffer.from(encodedToken, "base64").toString();
		const [siteId, token, privateToken] = decodedToken.split(":::");
		return {
			siteId,
			token,
			privateToken,
		};
	};

	public getToken = undefined;

	private token: MoodleToken;

	private axios: AxiosInstance;

	private generateFormData = (
		{ token }: MoodleToken,
		functionName: string,
		additionalFormData?: { [key: string]: string }
	) => {
		const formData = new FormData();
		formData.append("wstoken", token);
		formData.append("wsfunction", functionName);
		if (additionalFormData) {
			Object.entries(additionalFormData).forEach(([key, value]) => {
				formData.append(key, value);
			});
		}
		return formData;
	};

	private removeTrailingSlash = (url: string) => url.replace(/\/$/, "");

	public async getSiteConfiguration(): Promise<MoodleSiteConfiguration> {
		const {
			data: [{ data: siteConfig }],
		}: AxiosResponse<MoodleSiteConfigurationResponse> = await this.axios.request(
			{
				method: "POST",
				url: `/lib/ajax/service.php`,
				params: { info: "tool_mobile_get_public_config" },
				data: [
					{ index: 0, methodname: "tool_mobile_get_public_config", args: {} },
				],
			}
		);
		return siteConfig;
	}

	// public static getToken(launchUrl: string): any /* MoodleToken*/ {
	// 	return {};
	// }
	public async getUserConfiguration(): Promise<MoodleUserConfiguration> {
		const formData = this.generateFormData(
			this.token,
			"core_webservice_get_site_info"
		);
		const {
			data: userConfig,
		}: AxiosResponse<MoodleUserConfiguration> = await this.axios.request({
			method: "POST",
			url: `webservice/rest/server.php`,
			headers: formData.getHeaders(),
			params: { wsfunction: "core_webservice_get_site_info" },
			data: formData,
		});
		return userConfig;
	}
	public async getCourseContentById(
		courseId: number
	): Promise<MoodleCourseContent> {
		const formData = this.generateFormData(
			this.token,
			"core_course_get_contents",
			{
				courseid: courseId.toString(),
				"options[0][name]": "includestealthmodules",
				"options[0][value]": "1",
				"options[1][name]": "excludecontents",
				"options[1][value]": "1",
			}
		);
		const {
			data: sections,
		}: AxiosResponse<MoodleCourseSection[]> = await this.axios.request({
			method: "POST",
			url: `webservice/rest/server.php`,
			headers: formData.getHeaders(),
			params: { wsfunction: "core_course_get_contents" },
			data: formData,
		});
		return { id: courseId, sections };
	}

	public async getCourseSectionById(
		courseId: number,
		sectionId: number
	): Promise<MoodleCourseSection> {
		const formData = this.generateFormData(
			this.token,
			"core_course_get_contents",
			{
				courseid: courseId.toString(),
				"options[0][name]": "includestealthmodules",
				"options[0][value]": "1",
				"options[1][name]": "excludecontents",
				"options[1][value]": "1",
				"options[2][name]": "sectionid",
				"options[2][value]": `${sectionId}`,
			}
		);
		const {
			data: [section],
		}: AxiosResponse<MoodleCourseSection[]> = await this.axios.request({
			method: "POST",
			url: `webservice/rest/server.php`,
			headers: formData.getHeaders(),
			params: { wsfunction: "core_course_get_contents" },
			data: formData,
		});
		return section;
	}

	public async getCourseById(courseId: number): Promise<MoodleCourse> {
		const formData = this.generateFormData(
			this.token,
			"core_course_get_courses_by_field",
			{
				field: "id",
				value: `${courseId}`,
			}
		);
		const {
			data: {
				courses: [course],
			},
		}: AxiosResponse<{
			courses: MoodleCourse[];
			warnings: any[];
		}> = await this.axios.request({
			method: "POST",
			url: `webservice/rest/server.php`,
			headers: formData.getHeaders(),
			params: { wsfunction: "core_course_get_courses_by_field" },
			data: formData,
		});
		return course;
	}

	public async getAllCoursesByUserId(userId: number): Promise<MoodleCourse[]> {
		const formData = this.generateFormData(
			this.token,
			"core_enrol_get_users_courses",
			{ userid: userId.toString() }
		);
		const {
			data: allCourses,
		}: AxiosResponse<MoodleCourse[]> = await this.axios.request({
			method: "POST",
			url: `webservice/rest/server.php`,
			headers: formData.getHeaders(),
			params: { wsfunction: "core_enrol_get_users_courses" },
			data: formData,
		});
		return allCourses;
	}
}
