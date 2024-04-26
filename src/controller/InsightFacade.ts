import {
	Data,
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import JSZip, {JSZipObject} from "jszip";
import Section from "./Section";
import * as fs from "fs-extra";
import {isValidQueryStructure} from "./IsValidQuery";
import Room from "./Room";
import {Query} from "./Query";
import {parseHTML} from "./HelpFinR";
import {getFilter, getObject, getTransformation} from "./QueryOperations";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, Section[] | Room[]>;
	private findId: string;

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasets = new Map<string, Section[] | Room[]>();
		this.findId = "";
		this.readDataset();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
	//	 this.readDataset();
		if (!this.isValidID(id)) {
			return Promise.reject(new InsightError("Invalid ID"));
		}
		if (this.isDuplicateID(id)) {
			return Promise.reject(new InsightError("Duplicate ID"));
		}
		if (kind !== InsightDatasetKind.Sections && kind !== InsightDatasetKind.Rooms) {
			return Promise.reject(new InsightError("Invalid Kind"));
		}
		if (kind === InsightDatasetKind.Sections) {
			return this.parseSections(content, id);
		} else {
			return this.parseRooms(content, id);
		}
	}

	public removeDataset(id: string): Promise<string> {
		if (!this.isValidID(id)) {
			return Promise.reject(new InsightError("Invalid ID"));
		} else if (!this.datasets.has(id)) {
			return Promise.reject(new NotFoundError("a valid id was not yet added"));
		} else {
			fs.removeSync(`data/${id}.json`);
			this.datasets.delete(id);
			return Promise.resolve(id);
		}
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		if (!query || typeof query !== "object") {
			return Promise.reject(new InsightError("Query not Object"));
		}
		if (Object.keys(query).length < 2 || Object.keys(query).length > 3) {
			return Promise.reject(new InsightError("NOT RIGHT FORMAT"));
		}
		const i = isValidQueryStructure(query, this.datasets);
		if (typeof i !== "string") {
			return i;
		}
		let q = query as Query;
		return this.getResults(q, this.datasets.get(i) as Section[]).then((value) => {
			if (value.length > 5000) {
				return Promise.reject(new ResultTooLargeError("TO LARGE"));
			} else {
				return Promise.resolve(value);
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		//  this.readDataset();
		if (this.datasets.size === 0) {
			return new Promise((resolve, reject) => {
				resolve([]);
			});
		} else {
			let insightDatasets: InsightDataset[] = [];
			this.datasets.forEach((sections, id) => {
				let kind = (Object.keys(sections[0]).includes("pass")) ? InsightDatasetKind.Sections :
					InsightDatasetKind.Rooms;
				let insightDataset: InsightDataset = {
					id: id,
					numRows: sections.length,
					kind: kind,
				};
				insightDatasets.push(insightDataset);
			});
			return new Promise((resolve, reject) => {
				resolve(insightDatasets);
			});
		}
	}

	private isValidID(id: string): boolean {
		const substrings = ["_", " "];
		for (const substring of substrings) {
			if (id.includes(substring)) {
				return false;
			}
		}
		return id.length !== 0;
	}

	private isDuplicateID(id: string): boolean {
		return this.datasets.has(id);
	}

	private async parseSections(content: string, id: string): Promise<string[]> {
		const z = new JSZip();
		let sections: Section[] = [];
		let asyncPromises: any;
		return z.loadAsync(content, {base64: true}).catch(() => {
			return Promise.reject(new InsightError("Invalid Content"));
		}).then((zip: JSZip) => {
			const processFile = (jsf: JSZipObject) => {
				return zip.file(jsf.name)?.async("string")
					.then((jsc: string) => this.parseJson(jsc, sections));
			};
			asyncPromises = [];
			zip.forEach(async (path, jsf) => {
				if (jsf.dir && path !== "courses/") {
					return Promise.reject(new InsightError("Invalid Folder"));
				} else {
					const asyncResult = processFile(jsf);
					asyncPromises.push(asyncResult);
				}
			});
		}).then(async () => {
			await Promise.all(asyncPromises);
			if (sections.length === 0) {
				return Promise.reject(new InsightError("No Valid Sections"));
			} else {
				this.datasets.set(id, sections);
				return this.saveToDisk(id, sections, InsightDatasetKind.Sections);
			}
		}).catch((err) => {
			return Promise.reject(err);
		});
	}


	private async parseRooms(content: string, id: string): Promise<string[]> {
		const z = new JSZip();
		const rooms: Room[] = [];

		return z.loadAsync(content, {base64: true}).catch(() => {
			return Promise.reject(new InsightError("Invalid Content"));
		}).then((zip: JSZip) => parseHTML(zip, rooms))
			.then(() => {
				if (rooms.length === 0) {
					return Promise.reject(new InsightError("No Valid Rooms"));
				} else {
					this.datasets.set(id, rooms);
					return this.saveToDisk(id, rooms, InsightDatasetKind.Rooms);
				}
			})
			.catch((err) => {
				return Promise.reject(err);
			});
	}

	private parseJson(js: string, secs: Section[]) {
		let jso;
		try {
			jso = JSON.parse(js);
		} catch (err) {
			return Promise.reject(new InsightError());
		}
		jso.result.forEach((sec: any) => {
			let s: Section;
			if (Section.checkValidField(sec)) {
				s = new Section(sec);
				secs.push(s);
			}
		});
	}

	private async saveToDisk(i: string, secs: Section[] | Room[], kind: InsightDatasetKind): Promise<string[]> {
		let data: Data = {
			id: i,
			kind: kind,
			numRows: secs.length,
			sections: secs
		};
		await fs.mkdirp("data");
		// https://www.w3schools.com/js/js_string_templates.asp. Backticks in TS
		try {
			await fs.outputJSON(`data/${i}.json`, data);
		} catch (error) {
			return Promise.reject(new InsightError("Error writing JSON file"));
		}
		return [...this.datasets.keys()];
	}

	private getResults(q: Query, sr: any): Promise<InsightResult[]> {
		let wanted: any[] = [];
		for (const s of sr) {
			if (getFilter(q.WHERE, s)) {
				wanted.push(s);
			}
		}
		let results: InsightResult[] = [];
		if (Object.keys((q)).length === 3) {
			if (q.TRANSFORMATIONS !== undefined) {
				results = getTransformation(q.TRANSFORMATIONS, wanted, q.OPTIONS);
			}
		} else {
			for (const s of wanted) {
				results.push(getObject(q.OPTIONS, s));
			}
		}
		// if(results.length > 5000) {
		// 	return Promise.reject(new ResultTooLargeError("MORE THAN 5000"));
		// }
		if (Object.keys(q.OPTIONS).length > 1) {
			results = this.resultSort(results, Object.values(q.OPTIONS)[1]);
			// code modified from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
		}
		return Promise.resolve(results);
	}

	 public resultSort(r: InsightResult[], s: any): InsightResult[] {
		let so: any = Object.values(s)[0];
		if (typeof so === "string") {
			return r.sort((a: any, b: any) => {
				let as = a[s];
				let bs = b[s];
				if (as < bs) {
					return -1;
				}
				if (as > bs) {
					return 1;
				}
				return 0;
			});
		} else {
			return r.sort((a, b): number => {
				let d = so.dir;
				for (let k of so.keys) {
					let ak = a[k];
					let bk = b[k];
					if (ak < bk) {
						if (d === "UP") {
							return -1;
						} else {
							return 1;
						}
					}
					if (ak > bk) {
						if (d === "UP") {
							return 1;
						} else {
							return -1;
						}
					}
				}
				return 0;
			});
		}
	}


	private async readDataset() {
		if (fs.existsSync("data")) {
			// Check if there are any files in the directory
			let files = fs.readdirSync("data");
			if (files.length > 0) {
				let ids = [];
				for (const f of files) {
					const obj = fs.readJSONSync("data/" + f);
					this.datasets.set(obj.id, obj.sections);
					ids.push(obj.id);
				}
				for (let key of this.datasets.keys()) {
					if (!ids.includes(key)) {
						this.datasets.delete(key);
					}
				}
			}
		}
	}
}

