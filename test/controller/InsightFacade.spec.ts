import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";


import {folderTest} from "@ubccpsc310/folder-test";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import InsightFacade from "../../src/controller/InsightFacade";

use(chaiAsPromised);
export function assertOneResultNoOrder(actual: any, expected: any){
	expect(actual).to.have.deep.members(expected);
}

export function assertOneResultByOrder(actual: any, expected: any){
	expect(actual).to.have.deep.equals(expected);
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let subSections: string;
	let rooms: string;
	let smallRooms: string;
	let noIndex: string;


	before(function () {
		// This block runs once and loads the datasets.
		sections = getContentFromArchives("pair.zip");
		subSections = getContentFromArchives("pair1.zip");
		rooms = getContentFromArchives("campus.zip");
		smallRooms = getContentFromArchives("smallCampus.zip");
		noIndex = getContentFromArchives("campusWithoutIndex.zip");
		// Just in case there is anything hanging around from a previous run of the test suite
		 clearDisk();
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			clearDisk();
		});

		// it("should remove datasets from disk when removed", async () => {
		//
		// 	// Add a dataset
		// 	await facade.addDataset("room", smallRooms, InsightDatasetKind.Rooms);
		// 	await facade.addDataset("ubc",subSections,InsightDatasetKind.Sections);
		// 	// Simulate a crash by creating a new instance
		// 	const newInstance = new InsightFacade();
		//
		// 	// Check if the datasets file is removed from disk
		// 	await newInstance.addDataset("ubc1",subSections,InsightDatasetKind.Sections);
		// 	const datasets2 = await newInstance.listDatasets();
		// 	expect(datasets2).to.have.members(["room"]);
		// 	expect(datasets2).to.have.members(["sections"]);
		// });
		it("Add a room kind Dataset ", function () {
			const result = facade.addDataset("rooms",rooms,InsightDatasetKind.Rooms);
			return expect(result).to.eventually.have.members(["rooms"]);
		});
		it("Add two room kind Dataset",function (){
			const result = facade.addDataset("rooms",rooms,InsightDatasetKind.Rooms).then(() => {
				return facade.addDataset("smallRooms",smallRooms,InsightDatasetKind.Rooms);
			});
			return expect(result).to.eventually.have.members(["rooms","smallRooms"]);
		});
		it("should reject with no Index file",function (){
			const result = facade.addDataset("rooms",noIndex,InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it ("should reject with  an empty dataset id", function() {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with  an empty dataset id", function () {

			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);

		});

		it("should reject with an invalid id name (_)", function () {
			const result = facade.addDataset("ubc_", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with  an space dataset id", function () {

			const result = facade.addDataset(" ", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);

		});
		it("should reject if add to the rooms ", function () {
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should be reject with an invalid dataset(nothing in dataset) ", function () {
			const invalidDataset = getContentFromArchives("invalidDataset.zip");
			const result = facade.addDataset("ubc", invalidDataset, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should be reject with no file name courses ", function () {
			const invalidDataset = getContentFromArchives("notCourse.zip");
			const result = facade.addDataset("ubc", invalidDataset, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should be reject because the file is not zip", function () {
			const notZip = getContentFromArchives("notZip");
			const result = facade.addDataset("ubc", notZip, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should be reject because the file is not zip", function () {
			const notZip = getContentFromArchives("haveotherfolder.zip");
			const result = facade.addDataset("ubc", notZip, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should successfully add a dataset and should be right ", function () {
			const result = facade.addDataset("ubc", subSections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);

		});

		it(" add a dataset (twice) and should be reject", function () {

			const result = facade.addDataset("ubc", subSections, InsightDatasetKind.Sections).then(() => {
				return facade.addDataset("ubc", subSections, InsightDatasetKind.Sections);
			});

			return expect(result).to.eventually.be.rejectedWith(InsightError);

		});


		it("should successfully add a dataset and should be right ", function () {
			const result = facade.addDataset("ubc", subSections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);

		});

		it("should successfully add two datasets and should be right ", function () {
			const result = facade.addDataset("ubc", subSections, InsightDatasetKind.Sections).then(()=>{
				return facade.addDataset("abc", getContentFromArchives("pair1.zip"), InsightDatasetKind.Sections);
			});
			return expect(result).to.eventually.have.members(["ubc", "abc"]);

		});


		it("should successfully and it should be right again ", function () {
			const result = facade.addDataset("ubc", subSections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);

		});

		// This is a unit test. You should create more like this!

		it("list all added dataBase", function () {


			const result = facade.addDataset("ubc", rooms, InsightDatasetKind.Rooms)
				.then(() => {
					return facade.listDatasets();
				});
			return expect(result).to.eventually.have.deep.members(
				[
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 64612
					}
				]
			);
		});
		it("should reject with  an empty content", function () {
			const result = facade.removeDataset("");
			return expect(result).to.eventually.be.rejectedWith(InsightError);

		});
		it("should reject with  non_existing ", function () {
			const result = facade.removeDataset("ubc");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);

		});

		it("should  correctly remove one dataset",   function () {
			sections = getContentFromArchives("pair1.zip");
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then(() => {
					return facade.removeDataset("ubc");
				});
			return expect(result).to.eventually.equal("ubc");
		});

		it("should reject with a invalid empty dataset zip", () => {
			const result = facade
				.addDataset("ubc", getContentFromArchives("noPair.zip"), InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a invalid not courses dataset zip", () => {
			const result = facade
				.addDataset("ubc", getContentFromArchives("c.zip"), InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a empty sections courses in dataset zip", () => {
			const result =
					facade.addDataset("ubc", getContentFromArchives("noValidCourse.zip"),
						InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a not json formatted file courses dataset zip", () => {
			const result = facade
				.addDataset("ubc", getContentFromArchives("notJson.zip"), InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a not a valid query field file courses dataset zip", () => {
			const result =
					facade
						.addDataset("ubc", getContentFromArchives("invalidQueryField.zip"),
							InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});


		it("should reject correctly After two Removes",   function () {
			sections = getContentFromArchives("pair1.zip");
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then(() => {
					return facade.removeDataset("ubc");
				})
				.then(() => {
					return facade.removeDataset("ubc");
				});


			return expect(result).to.eventually.be.rejectedWith(NotFoundError);


		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			facade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				facade.addDataset("sections", getContentFromArchives("pair.zip"), InsightDatasetKind.Sections),
				facade.addDataset("SmallSection",getContentFromArchives("pair1.zip"),InsightDatasetKind.Sections),
				facade.addDataset("rooms",getContentFromArchives("campus.zip"),InsightDatasetKind.Rooms)
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			clearDisk();
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult:  (actual, expected) => {
					// TODO add an assertion!
					assertOneResultNoOrder(actual,expected);
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					// TODO add an assertion!
					if (expected === "InsightError") {
						expect(actual).to.be.instanceof(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						// this should be unreachable
						expect.fail("UNEXPECTED ERROR");
					}
				},
			}
		);
	});
});
