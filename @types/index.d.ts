type MoodleCourses = Array<Course>;

interface Course {
	id: number;
	title: string;
	sections: Array<CourseSection>;
}

interface CourseSection {
	id: number;
	title: string;
	summary?: string;
	content: string;
	content?: CourseSectionContent;
	available: AvailabilityStatus;
}

type CourseSectionContent = Array<ContentBlock> | undefined;

interface ContentBlock {
	id: number;
	modtype?: string;
}

interface LinkContentBlock extends ContentBlock {
	url: string;
	title: string;
	icon?: Buffer;
}

interface TextContentBlock extends ContentBlock {
	text: string;
}
