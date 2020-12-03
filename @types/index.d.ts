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
	description: string;
}

interface TextContentBlock extends ContentBlock {
	text: string;
}

interface HTMLContentBlock extends ContentBlock {
	html: string;
}
