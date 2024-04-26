import {InsightError} from "./IInsightFacade";
import Section from "./Section";
import {Filter, Options, Query}from "./Query";
import Room from "./Room";
const SectionMFIELD = ["avg" , "pass" , "fail" , "audit" , "year"];
const SectionSFIELD = ["dept" , "id" , "instructor" , "title" , "uuid"];
const SectionFIELD = [...SectionMFIELD, ...SectionSFIELD];
const RoomMFIELD = ["lat" , "lon" , "seats"];
const RoomSFIELD = ["fullname" , "shortname" , "number" , "name" ,"address" , "furniture" , "type" , "href"];
const RoomFIELD = [...RoomMFIELD, ...RoomSFIELD];
const APPLYTOKEN = ["MAX"  ,"MIN" , "AVG" , "COUNT" , "SUM"];
let oneKey: string;
let myDataset: Map<string, Section[]|Room[]>;
let allIDs: string[];
let myApplyKeys: string[];
let myGroup: string[];
function isValidGroup(keyList: any) {
	if(Array.isArray(keyList)) {
		if(keyList.length >= 1) {
			const isValidKeys = keyList.every((key)=> {
				return isValidKey(key,SectionFIELD,RoomFIELD);
			});
			if (isValidKeys) {
				myGroup = [...myGroup, ...keyList];
				return true;
			}else {
				return false;
			}
		}
	}
	return false;
}

function isValidApply(applyRuleList: any) {
	if (Array.isArray(applyRuleList)){
		if (applyRuleList.length === 0) {
			return true;
		}
		for (const applyRule of applyRuleList){
			if (typeof applyRule !== "object") {
				return false;
			}
			if (Object.keys(applyRule).length !== 1) {
				return false;
			}
			if (Object.keys(applyRule)[0].includes("_") || Object.keys(applyRule)[0] === "") {
				return false;
			}
			if (Object.values(applyRule).length !== 1 || typeof Object.values(applyRule)[0] !== "object") {
				return false;
			}
			let ob = Object.values(applyRule)[0] as object;
			if(APPLYTOKEN.includes(Object.keys(ob)[0])) {
				if (Object.keys(ob)[0] === "COUNT" && isValidSMKey(Object.values(ob)[0])){
					if (myApplyKeys.includes(Object.keys(applyRule)[0])) {
						return false;
					}
					myApplyKeys.push(Object.keys(applyRule)[0]);
				}else if(isValidMKey(Object.values(ob)[0])) {
					if (myApplyKeys.includes(Object.keys(applyRule)[0])) {
						return false;
					}
					myApplyKeys.push(Object.keys(applyRule)[0]);
				}
			}
		}
		return true;
	}
	return false;
}

function isValidTransformations(q: any) {
	if(Object.keys(q).includes("TRANSFORMATIONS")) {
		if (typeof q.TRANSFORMATIONS === "object"){
			if(q.TRANSFORMATIONS.GROUP && q.TRANSFORMATIONS.APPLY) {
				return isValidGroup(q.TRANSFORMATIONS.GROUP) && isValidApply(q.TRANSFORMATIONS.APPLY);
			}
		}
	}
	return false;
}

export function isValidQueryStructure(query: any, dataset: any){
	oneKey = "";
	myApplyKeys = [];
	myGroup = [];
	allIDs = [];
	myDataset = dataset;
	allIDs = Array.from(myDataset.keys());
	if (!isValidBody(query)) {
		return Promise.reject(new InsightError("NOT Invalid Where"));
	}
	if (query.TRANSFORMATIONS) {
		if (!isValidTransformations(query)) {
			return Promise.reject(new InsightError("Not Invalid Transformations"));
		}
	}
	if (!isValidOption(query)) {
		return Promise.reject(new InsightError("NOT Invalid OPTIONS"));
	}
	if (oneKey === "") {
		return Promise.reject(new InsightError());
	}
	return oneKey;
}
function isValidColumnKeysHasT(columns: any) {
	return 	columns.every((element: any) => {
		return  myGroup.includes(element) || myApplyKeys.includes(element);
	});
}

function isValidSort(order: any,col: any) {
	if(Object.keys(order).length !== 2 || !Object.keys(order).includes("keys") || !Object.keys(order).includes("dir")){
		return false;
	}
	if (!Array.isArray(order.keys)){
		return false;
	}
	if(order.keys.length === 0) {
		return false;
	}
	let keyList: string[] = order.keys;
	return ["UP","DOWN"].includes(order.dir) && keyList.every((key)=> {
		return col.includes(key);
	});
}

function isValidColumnKeysNoT(columns: any) {
	return 	columns.every((element: any) => {
		return  isValidSMKey(element);
	});
}

function isValidColumnOrder(options: any,hasT: any): boolean {
	if (!Object.keys(options).includes("COLUMNS") || !options.COLUMNS || !Array.isArray(options.COLUMNS) ||
		options.COLUMNS.length < 1) {
		return false;
	}
	if (hasT !== undefined) {
		if (!isValidColumnKeysHasT(options.COLUMNS)) {
			return false;
		}
	}else{
		if (!isValidColumnKeysNoT(options.COLUMNS)) {
			return false;
		}
	}

	if (options.ORDER) {
		if (typeof options.ORDER === "string" ) {
			return options.COLUMNS.includes(options.ORDER);
		}
		if (typeof options.ORDER === "object") {
			return  isValidSort(options.ORDER,options.COLUMNS);
		}
		if (typeof options.ORDER !== "string" || typeof options.ORDER !== "object") {
			return false;
		}
	}
	return true;
}
function isValidOption(query: any) {
	if(Object.keys(query)[1] !== "OPTIONS") {
		return false;
	}
	if (typeof query.OPTIONS !== "object") {
		return false;
	}
	return isValidColumnOrder(query.OPTIONS,query.TRANSFORMATIONS);
}
function isValidBody(query: any){
	if (Object.keys(query.WHERE).length === 0 ) {
		return  true;
	}else if(Object.keys(query.WHERE).length > 1) {
		return false;
	} else {
		return isValidFilter(Object.keys(query.WHERE)[0],Object.values(query.WHERE)[0]);
	}
}
export function isValidFilter(key: string,value: any): boolean {
	if (key === "AND" || key === "OR") {
		return isValidLogicComparison(value);
	}else if (key === "LT" || key === "GT" || key === "EQ") {
		return isValidMComparison(value);
	} else if(key === "IS") {
		return isValidSComparison(value);
	} else if(key === "NOT") {
		return isValidNegation(value);
	} else {
		return false;
	}
}
export function isValidLogicComparison(logicComparison: any){
	if (logicComparison.length === 0) {
		return false;
	}
	if (Array.isArray(logicComparison)) {
		for (const subLogicComparison of logicComparison) {
			if (typeof subLogicComparison === "object") {
				if (!isValidFilter(Object.keys(subLogicComparison)[0],Object.values(subLogicComparison)[0])) {
					return false;
				}
			}
		}
		return true;
	}
	return false;
}
function isValidMComparison(mComparison: any) {
	if (typeof mComparison !== "object") {
		return false;
	}
	if (Object.keys(mComparison).length !== 1){
		return false;
	}else if(typeof Object.values(mComparison)[0] !== "number" ){
		return false;
	}
	return isValidMKey(Object.keys(mComparison)[0]);
}
function isValidSComparison(sComparison: any) {
	if (typeof sComparison !== "object") {
		return false;
	}
	if(Object.keys(sComparison).length !== 1) {
		return false;
	}
	return isValidSKey(Object.keys(sComparison)[0]) && isValidInputString(Object.values(sComparison)[0]);
}

function isValidNegation(negation: any): boolean {
	if (typeof negation !== "object") {
		return false;
	}
	if(Object.keys(negation).length !== 1) {
		return false;
	}
	return isValidFilter(Object.keys(negation)[0],Object.values(negation)[0]);
}
function isValidMKey(mKey: string) {
	return isValidKey(mKey,SectionMFIELD,RoomMFIELD);
}
function isValidSKey(sKey: string) {
	return isValidKey(sKey,SectionSFIELD,RoomSFIELD);
}
function isValidSMKey(smKey: any) {
	if (typeof smKey !== "string") {
		return false;
	}
	return isValidKey(smKey,SectionFIELD,RoomFIELD);
}
function isValidKey(key: string,section: string[], room: string[],) {
	const subKeys = key.split("_");
	const idString = subKeys[0];
	const field = subKeys[1];
	if (subKeys.length !== 2 || !allIDs.includes(idString)) {
		return false;
	}
	let a = myDataset.get(idString);
	if (a === undefined) {
		return false;
	}
	if (a[0] instanceof Section){
		if (oneKey === "") {
			oneKey = idString;
			return section.includes(field);
		}
		return oneKey === idString && section.includes(field);
	}
	if (a[0] instanceof Room) {
		if (oneKey === "") {
			oneKey = idString;
			return room.includes(field);
		}
		return oneKey === idString && room.includes(field);
	} else {
		return false;
	}
}

function isValidInputString(iString: any) {
	if(typeof iString !== "string"){
		return false;
	}
	const regex = /\*/g;
	let found = iString.match(regex)?.length;
	if (found === undefined) {
		return true;
	} else if(found === 1) {
		return iString.endsWith("*") || iString.startsWith("*");
	}else if(found === 2) {
		return iString.endsWith("*") && iString.startsWith("*");
	}
	return false;
}
export function getID(q: Query) {
	return Object.values(q.OPTIONS)[0][0].split("_")[0];
}


