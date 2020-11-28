type MoodleCourses = Array<Course>;

interface Course {
	id: number;
	title: string;
	sections: Array<CourseSection>;
}

interface CourseSection {
	id: number;
	title: string;
	content: string;
}