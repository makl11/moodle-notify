export interface MoodleAPI {
	getSiteConfiguration: () => Promise<MoodleSiteConfiguration>;
	getToken?: () => Promise<MoodleToken>;
	getUserConfiguration: () => Promise<MoodleUserConfiguration>;
	getCourseContentById: (courseId: number) => Promise<MoodleCourseContent>;
	getCourseById: (courseId: number) => Promise<MoodleCourse>;
	getAllCoursesByUserId: (userId: number) => Promise<MoodleCourse[]>;
	getCourseSectionById: (
		courseId: number,
		sectionId: number
	) => Promise<MoodleCourseSection>;
}

export interface MoodleToken {
	siteId: string;
	token: string;
	privateToken?: string;
}

export type MoodleSiteConfigurationResponse = [
	{ error: boolean; data: MoodleSiteConfiguration }
];

export interface MoodleSiteConfiguration {
	wwwroot: string;
	httpswwwroot: string;
	sitename: string;
	guestlogin: number;
	rememberusername: number;
	authloginviaemail: number;
	registerauth: string;
	forgottenpasswordurl: string;
	authinstructions: string;
	authnoneenabled: number;
	enablewebservices: number;
	enablemobilewebservice: number;
	maintenanceenabled: number;
	maintenancemessage: string;
	logourl: string;
	compactlogourl: string;
	typeoflogin: number;
	launchurl: string;
	mobilecssurl: string;
	tool_mobile_disabledfeatures: string;
	country: string;
	agedigitalconsentverification: boolean;
	autolang: number;
	lang: string;
	langmenu: number;
	langlist: string;
	locale: string;
	warnings: any[];
}

export interface MoodleUserProfile {
	userid: number;
	username: string;
	firstname: string;
	lastname: string;
	fullname: string;
	userpictureurl: string;
}

export interface MoodleUserConfiguration extends MoodleUserProfile {
	sitename: string;
	lang: string;
	siteurl: string;
	functions: {
		name: string;
		version: string;
	}[];
	downloadfiles: number;
	uploadfiles: number;
	release: string;
	version: string;
	mobilecssurl: string;
	advancedfeatures: {
		name: string;
		value: number;
	}[];
	usercanmanageownfiles: boolean;
	userquota: number;
	usermaxuploadfilesize: number;
	userhomepage: number;
	siteid: number;
	sitecalendartype: string;
	usercalendartype: string;
}

// export interface MoodleCourse {
// 	id: number;
// 	title: string;
// 	sections: Array<MoodleCourseSection>;
// }

enum AvailabilityStatus {
	NOT_AVAILABLE,
	AVAILABLE,
	PARTIAL,
}

export enum MoodleSectionModuleType {
	Forum = "forum",
	Label = "label",
	Resource = "resource",
	Assignment = "Assignment",
	Folder = "folder",
	Chat = "chat",
	ChoiceGroup = "choicegroup",
	Scheduler = "scheduler",
	Page = "page",
	HVP = "hvp",
	Quiz = "quiz",
	Url = "url",
	LTI = "lti",
	Workshop = "workshop",
	Choice = "choice",
	Feedback = "feedback",
}

export interface MoodleCourse {
	id: number;
	shortname: string;
	fullname: string;
	enrolledusercount: number;
	idnumber: string;
	visible: number;
	summary: string;
	summaryformat: number;
	format: string;
	showgrades: boolean;
	lang: string;
	enablecompletion: boolean;
	category: number;
	progress: number;
	startdate: number;
	enddate: number;
}

export interface MoodleCourseSection {
	id: number;
	name: string;
	visible: number;
	summary: string;
	summaryformat: number;
	section: number;
	hiddenbynumsections: number;
	uservisible: boolean;
	modules: MoodleSectionModule[];
}

export interface MoodleSectionModule {
	id: number;
	url?: string;
	name: string;
	instance: number;
	visible: number;
	uservisible: boolean;
	visibleoncoursepage: number;
	modicon: string;
	modname: MoodleSectionModuleType;
	modplural: string;
	indent: number;
	description?: string;
}

export interface MoodleCourseContent {
	id: number;
	sections: MoodleCourseSection[];
}
