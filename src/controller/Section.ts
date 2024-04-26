export default class Section {

	private readonly uuid: string;
	private readonly id: string;
	private readonly title: string;
	private readonly instructor: string;
	private readonly dept: string;
	private readonly year: number;
	private readonly avg: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;
	constructor(s: any) {
		this.uuid = s.id;
		this.id = s.Course;
		this.title = s.Title;
		this.instructor = s.Professor;
		this.dept = s.Subject;
		if (s.Section === "overall") {
			this.year = 1900;
		} else {
			this.year = parseInt(s.Year, 10);
		}
		this.avg = parseFloat(s.Avg);
		this.pass = parseInt(s.Pass, 10);
		this.fail = parseInt(s.Fail, 10);
		this.audit = parseInt(s.Audit, 10);
	}

	public static checkValidField(sec: any): boolean {
		return "id" in sec && "Course" in sec && "Title" in sec && "Professor" in sec &&
			"Subject" in sec && "Year" in sec && "Avg" in sec && "Pass" in sec && "Fail" in sec && "Audit" in sec;
	}

	public get(s: string): string | number {
		switch (s) {
			case "uuid": {
				return this.uuid;
			}
			case "id": {
				return this.id;
			}
			case "title": {
				return this.title;
			}
			case "instructor": {
				return this.instructor;
			}
			case "dept": {
				return this.dept;
			}
			case "year": {
				return this.year;
			}
			case "avg": {
				return this.avg;
			}
			case "pass": {
				return this.pass;
			}
			case "fail": {
				return this.fail;
			}
			default: {
				return this.audit;
			}
		}
	}
}
