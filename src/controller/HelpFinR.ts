import JSZip from "jszip";
import Room from "./Room";
import {parse} from "parse5";
import {InsightError} from "./IInsightFacade";
import http from "node:http";
import {buildName, roomName} from "./IsValidQueryHelps";
const TeamNumber = "163";

interface BuildInf {
	FullName: string|undefined,
    Shortname: string|undefined,
	Address: string|undefined;
}
interface RoomInf {
  Number: string|undefined;
  Seats: string|undefined;
  Type: string|undefined;
  Furniture: string|undefined;
  Href: string|undefined;
}
interface GeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}
export function getHref(n: any) {
	const nodes: any[] = [n];
	while (nodes.length) {
		const currentNode = nodes.pop() as any;
		if (currentNode.nodeName === "a") {
			for(const attr of currentNode.attrs) {
				if(attr.name === "href" && attr.value.endsWith(".htm")) {
					return attr.value.substring(2);
				}
			}
		}
		if (currentNode.childNodes) {
			const nodesArray = Array.from(currentNode.childNodes);
			nodes.push(...nodesArray);
		}
	}
}

export function getHref1(n: any) {
	const nodes: any[] = [n];
	while (nodes.length) {
		const currentNode = nodes.pop() as any;
		if (currentNode.nodeName === "a") {
			for(const attr of currentNode.attrs) {
				if(attr.name === "href") {
					return attr.value;
				}
			}
		}
		if (currentNode.childNodes) {
			const nodesArray = Array.from(currentNode.childNodes);
			nodes.push(...nodesArray);
		}
	}
}

export function getCNodesWithGivenName(n: any , name: string) {
	let found = [];
	let children = Array.from(n.childNodes) as any[];
	for (const cn of children) {
		if(cn.nodeName === name) {
			found.push(cn);
		}
	}
	return found;
}

export function getValidDescendentsTable(tree: any, tables: any[],cls: string[]) {
	const nodes: any[] = [tree];
	while (nodes.length) {
		const currentNode = nodes.pop() as any;
		if (currentNode.nodeName === "table") {
			const value = cls.every((cl)=> {
				return checkTable(currentNode,cl);
			});
			if (value) {
				tables.push(currentNode);
				return;
			}
		}
		if (currentNode.childNodes) {
			const nodesArray = Array.from(currentNode.childNodes);
			nodes.push(...nodesArray);
		}
	}
}

//  Check the table is valid building table.
export function checkTable(n: any, cl: string): boolean {
	let foundTbody = getCNodesWithGivenName(n,"tbody");
	if(foundTbody.length !== 1) {
		return false;
	} else{
		for (const row of getCNodesWithGivenName(foundTbody[0],"tr")) {
			const cols = getCNodesWithGivenName(row,"td");
			let es = cols as any[];
			for (const e of es) {
				if(e.attrs[0].value === cl) {
					return true;
				}
			}
		}
	}
	return false;
}

function getRoomFurniture(td: any) {
	return getContentWithoutA(td,"views-field views-field-field-room-furniture");
}
function getRoomInf(tr: any) {
	let room: RoomInf = {
		Number: undefined ,
		Seats: undefined,
		Type: undefined,
		Furniture: undefined,
		Href: undefined
	};
	let tds = getCNodesWithGivenName(tr,"td");
	for (const td of tds) {

		if (room.Number === undefined) {
			room.Number = getRoomNumber(td);
		}
		if (room.Seats === undefined) {
			room.Seats = getRoomSets(td);
		}
		if (room.Type === undefined) {
			room.Type = getRoomType(td);
		}
		if (room.Furniture === undefined) {
			room.Furniture = getRoomFurniture(td);
		}
		if (room.Href === undefined) {
			room.Href = getHref1(td);
		}
	}
	return room;
}
function getBuildInf(row: any) {
	let build: BuildInf = {
		FullName: undefined,
		Shortname: undefined,
		Address: undefined,
	};
	let tds = getCNodesWithGivenName(row,"td");
	for (const td of tds) {
		if (build.FullName === undefined) {
			build.FullName = getBuildingfName(td);
		}
		if (build.Shortname === undefined) {
			build.Shortname = getBuildingsName(td);
		}
		if (build.Address === undefined) {
			build.Address = getRoomAddress(td);
		}
	}
	return build;
}

function getContentWithoutA(td: any,className: string) {
	for (const attr of td.attrs) {
		if (attr.name === "class" && attr.value === className) {
			return td.childNodes[0].value.trim();
		}
	}
	return undefined;
}

function getContentWithA(td: any,className: string) {
	for (const attr of td.attrs) {
		if (attr.name === "class" && attr.value === className) {
			for (const a of getCNodesWithGivenName(td, "a")) {
				for (const text of getCNodesWithGivenName(a, "#text")) {
					return text.value.trim();
				}
			}
		}
	}
	return undefined;
}

function getBuildingfName(td: any) {
	return getContentWithA(td, "views-field views-field-title");
}

function getBuildingsName(td: any) {
	return getContentWithoutA(td, "views-field views-field-field-building-code");
}

function getRoomNumber(td: any) {
	return getContentWithA(td, "views-field views-field-field-room-number");
}


function getRoomType(td: any) {
	return getContentWithoutA(td, "views-field views-field-field-room-type");
}

function getRoomAddress(td: any) {
	return getContentWithoutA(td, "views-field views-field-field-building-address");
}

function getRoomSets(td: any) {
	return getContentWithoutA(td, "views-field views-field-field-room-capacity");
}

export async function parseHTML(zip: JSZip, rooms: Room[]) {
	let idxFile = zip.file("index.htm");
	if (idxFile !== null) {
		let tree = parse(await idxFile.async("string"));
		const bTables: any[] = [];
		getValidDescendentsTable(tree, bTables, buildName);
		if (bTables.length === 0) {
			return Promise.reject(new InsightError("No Building table"));
		}
		let foundTbody = getCNodesWithGivenName(bTables[0], "tbody");
		const trElements = getCNodesWithGivenName(foundTbody[0], "tr");
		const promises = trElements.map(async (row) => {
			const path = getHref(row);
			if (!path) {
				return Promise.resolve();
			}
			const roomFile = zip.file(path);
			if (!roomFile) {
				return Promise.resolve();
			}
			const roomFileContent = await roomFile.async("string");
                // Process 'room' as needed
			let rTables: any[] = [];
			getValidDescendentsTable(parse(roomFileContent),
				rTables, roomName);
			if (rTables.length === 0) {
				return Promise.resolve();
			}
			const buildI = getBuildInf(row);
			const geo = await getBuildLocation(buildI.Address as string, TeamNumber);
			let elements = getCNodesWithGivenName(getCNodesWithGivenName(rTables[0], "tbody")[0], "tr");
			for (const tr of elements) {
				const roomI = getRoomInf(tr);
				// if (buildI.FullName && buildI.Shortname && buildI.Address && roomI.Number
                //          && roomI.Href && roomI.Type && roomI.Seats && roomI.Furniture) {
				if (geo !== undefined) {
					rooms.push(new Room(buildI.FullName, buildI.Shortname, buildI.Address,
						roomI.Number,roomI.Href,roomI.Type,roomI.Seats,roomI.Furniture,geo));
				}
			}
			// }
			return Promise.resolve();
		});
		try {
			await Promise.all(promises);
                // roomData will contain an array of results after all promises are resolved
		} catch (error) {
                // Handle errors here
		}
	}else{
		return Promise.reject(new InsightError("No Index File"));
	}
}
async function getBuildLocation(address: string, teamNumber: string): Promise<GeoResponse> {
	try {
		const encodedAddress = encodeURIComponent(address);
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${teamNumber}/${encodedAddress}`;
		const data = await makeHttpRequest(url);
		const geoResponse = JSON.parse(data);
		if (geoResponse.error) {
			throw new Error(geoResponse.error);
		} else if (geoResponse.lat !== undefined && geoResponse.lon !== undefined) {
			return geoResponse;
		} else {
			throw new Error("Invalid response format from geolocation service");
		}
	} catch (error) {
		throw new Error("Error retrieving geolocation data");
	}
}

function makeHttpRequest(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		http.get(url, (response) => {
			let data = "";

			response.on("data", (chunk) => {
				data += chunk;
			});

			response.on("end", () => {
				resolve(data);
			});
			response.on("error", (error) => {
				reject(error);
			});
		});
	});
}
