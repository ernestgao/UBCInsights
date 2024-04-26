import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import * as fs from "fs";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;

	before(async function () {
		facade = new InsightFacade();
		server = new Server(4321);
		// server.setInsightFacade(facade);
		try {
			await server.start();
		} catch (err) {
			console.log(err);
		}
		// TODO: start server here once and handle errors properly
	});

	after(function () {
		// TODO: stop server here once!
		server.stop();
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
		 clearDisk();
		// let subSections = getContentFromArchives("pair1.zip");
		// facade.addDataset("sub",subSections,InsightDatasetKind.Sections);
	});

	afterEach(function () {
		clearDisk();
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", function () {
		try {
			// Specify the path to your existing ZIP file
			const zipFilePath = "test/resources/archives/pair1.zip";
			// Read the ZIP file as a buffer
			const zipFileBuffer = fs.readFileSync(zipFilePath);
			// const base64Data = zipFileBuffer.toString("base64");
			return request("http://localhost:4321")
				.put("/dataset/mySection/sections")
				.send(zipFileBuffer)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					return request("http://localhost:4321")
						.put("/dataset/mySection/sections")
						.send(zipFileBuffer)
						.set("Content-Type", "application/x-zip-compressed")
						.then((res1)=> {
							expect(res1.status).to.be.equal(400);
						});
				})
				.catch(function (err) {
					console.log(err);
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});
	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
	it("Post test for courses dataset", function () {
		try {
			const zipFilePath = "test/resources/archives/pair1.zip";
			// Read the ZIP file as a buffer
			const zipFileBuffer = fs.readFileSync(zipFilePath);
			return request("http://localhost:4321")
				.get("/datasets")
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log(err);
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	it("Post test for courses dataset after Close", function () {
		try {
			const zipFilePath = "test/resources/archives/pair1.zip";
			// Read the ZIP file as a buffer
			const zipFileBuffer = fs.readFileSync(zipFilePath);
			return request("http://localhost:4321")
				.get("/datasets")
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log(err);
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});

});
