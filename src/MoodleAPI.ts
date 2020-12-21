import Axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { HTMLElement, parse } from "node-html-parser";
import md5 from "md5";

enum AvailabilityStatus {
	NOT_AVAILABLE,
	AVAILABLE,
	PARTIAL,
}

export async function createAuthMoodleClientWithCookies(
	cookies: string
): Promise<any> {
	const authenticatedMoodleClient = Axios.create({
		baseURL: "https://elearning.hs-ruhrwest.de/",
		withCredentials: true,
		headers: {
			Cookie: cookies,
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
	const sectionElements = document.querySelectorAll(".section.main");
	const sections = sectionElements.map(getSectionData);
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
	const hash = md5(section.innerHTML);
	const id = parseInt(section.id.replace(/^section-(\d+)$/, "$1"));
	const title = section.querySelector(".content .sectionname").text;
	const available = getSectionAvailability(section);
	const summaryString = removeNoOverflowWrapperElements(
		section.querySelector(".content .summary")
	)?.innerHTML;
	const summary = summaryString?.length > 0 ? summaryString : undefined;
	const content = getSectionContent(section);
	return {
		id,
		hash,
		title,
		available,
		summary,
		content,
	};
}
function getSectionContent(section: HTMLElement): CourseSectionContent {
	const content = section.querySelector(".content .section");
	if (!content) return undefined;
	const blocks = content.querySelectorAll(".activity");
	const ContentBlocks: Array<ContentBlock> = blocks.map(
		(block: HTMLElement) => {
			const id = parseInt(block.id.replace(/^module-(\d+)$/, "$1"));
			const modtype = block.classNames
				.find((cN) => /modtype_[a-z]+/.test(cN))
				?.replace(/modtype_([a-z]+)/, "$1");
			const text = block.querySelector(".contentwithoutlink");
			const link = block.querySelector(".activityinstance a");
			const contentAfterLink = block.querySelector(".contentafterlink");
			if (text && text.childNodes.length > 0 && !link) {
				const html = removeNoOverflowWrapperElements(
					text.querySelector(".no-overflow")
				).innerHTML;
				return <HTMLContentBlock>{
					id,
					modtype,
					html,
				};
			}
			if (link && link.childNodes.length > 0 && !text) {
				const description = contentAfterLink
					? removeNoOverflowWrapperElements(contentAfterLink)
							.innerHTML
					: undefined;
				return <LinkContentBlock>{
					id,
					modtype,
					description,
					url: link.getAttribute("href"),
					title: link.querySelector(".instancename")?.text,
				};
			}
			return <ContentBlock>{ id, modtype: "empty" };
		}
	);
	return ContentBlocks.filter((cB) => cB.modtype !== "empty");
}

const removeNoOverflowWrapperElements = (element: HTMLElement) =>
	removeNestedWrapperElements(element, "no-overflow");

function removeNestedWrapperElements(
	element: HTMLElement,
	className: string
): HTMLElement {
	if (
		element &&
		element.classNames.length === 1 &&
		element.structure.includes(className)
	) {
		if (
			element.childNodes.length === 1 &&
			// @ts-ignore firstChild is a HTMLElement not a Node
			element.firstChild?.structure?.includes(className)
		) {
			const orphan = element.querySelector("*");
			return removeNestedWrapperElements(orphan, className);
		} else {
			element.setAttribute(
				"class",
				element.getAttribute("class")?.replace(className, "") ?? ""
			);
			element.classNames = element.classNames.filter(
				(cN) => cN !== className
			);
		}
	}
	return element;
}

export async function getMoodleData(
	moodleClient: AxiosInstance
): Promise<MoodleCourses> {
	const courseIds = await getCourseIds(moodleClient);
	const allCourseData = await Promise.all(
		courseIds.map((id) => getCourseData(moodleClient, id))
	);
	return allCourseData;
}
