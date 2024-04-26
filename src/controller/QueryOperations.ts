import Section from "./Section";
import Room from "./Room";
import {} from "./IsValidQuery";
import {InsightResult} from "./IInsightFacade";
import Decimal from "decimal.js";
import {Filter, Options, Query, Transformations} from "./Query";
import * as fs from "fs-extra";


export function getID(q: Query) {
	return Object.values(q.OPTIONS)[0][0].split("_")[0];
}
export function getFilter(f: Filter, s: Section|Room): boolean {
	let k = Object.keys(f)[0];
	let v = Object.values(f)[0];
	switch (k) {
		case "AND": {
			let a = true;
			for (const i of v) {
				if (!getFilter(i,s)) {
					a = false;
					break;
				}
			}
			return a;
		}
		case "OR": {
			let a = false;
			for (const i of v) {
				if (getFilter(i,s)) {
					a = true;
					break;
				}
			}
			return a;
		}
		case "GT": {
			return s.get(Object.keys(v)[0].split("_")[1]) > (Object.values(v)[0] as number);
		}
		case "LT": {
			return s.get(Object.keys(v)[0].split("_")[1]) < (Object.values(v)[0] as number);
		}
		case "EQ": {
			return s.get(Object.keys(v)[0].split("_")[1]) === (Object.values(v)[0] as number);
		}
		case "IS": {
			return stringWildcard((s.get(Object.keys(v)[0].split("_")[1]) as string),(Object.values(v)[0] as string));
		}
		case "NOT": {
			return !getFilter(v, s);
		}
		default: {
			return true;
		}
	}
}
// code retrieved from https://www.delftstack.com/howto/javascript/wildcard-string-comparison-in-javascript/
function stringWildcard(str: string, rule: string) {
	let escapeRegex = (s: string) => s.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1");
	return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
}
export function getObject(o: Options, s: Section|Room) {
	let c = Object.values(o)[0];
	let v0 = s.get(c[0].split("_")[1]);
	let str: string;
	if (typeof v0 === "number") {
		str = `{"${c[0]}":${s.get(c[0].split("_")[1])}`;
	} else {
		str = `{"${c[0]}":"${s.get(c[0].split("_")[1])}"`;
	}
	if (c.length > 1) {
		for (let i = 1; i < c.length; i++) {
			let v = s.get(c[i].split("_")[1]);
			if (typeof v === "number") {
				str = str.concat(`, "${c[i]}":${v}`);
			} else {
				str = str.concat(`, "${c[i]}":"${v}"`);
			}
		}
	}
	str = str.concat("}");
	return JSON.parse(str);
}

export function getTransformation(t: Transformations, sr: any, o: Options): InsightResult[] {
	// let wantedMap: Map<string, Map<string, any>> = new Map<string, Map<string, any>>();
	let grp = Object.values(t)[0];
	const groupByFields = <T>(list: T[], getKeys: (item: T) => string[]) =>
		list.reduce((previous, currentItem) => {
			const group = getKeys(currentItem).join("$");
			if (!previous[group]) {
				previous[group] = [];
			}
			previous[group].push(currentItem);
			return previous;
		}, {} as Record<string, T[]>);
	let res = groupByFields(sr,(item) => {
		let keyStr: string[] = [];
		for (const g of grp) {
			let k = (item as Section | Room).get(g.split("_")[1]);
			if (typeof k === "number") {
				k = k.toString();
			}
			keyStr.push(g.split("_")[1] + "@" + k);
		}
		return keyStr;
	});
	let applyList = Object.values(t)[1];
	let m;
	if (applyList.length > 0) {
		m = getApply(applyList, res);
	} else {
		m = new Map();
		for (const key in res) {
			m.set(key, "");
		}
	}
	return applyObject(m, o);
}

function getApply(apply: any, r: any): any {
	let m: any = new Map();
	let applyKeys = apply.reduce((accumulator: any, currentObject: any) => {
		accumulator.push(Object.keys(currentObject)[0]);
		return accumulator;
	}, []);
	for (const a of apply) {
		const token = Object.values(a)[0] as object;
		const k = (Object.values(token)[0]).split("_")[1];
		for (const key in r) {
			let fk = key + "|" + applyKeys.join("|");
			if (m.has(fk)) {
				m.get(fk).push(applyToken(Object.keys(token)[0], k, r[key]));
			} else {
				m.set(fk, [applyToken(Object.keys(token)[0], k, r[key])]);
			}
		}
	}
	return m;
}

function applyToken(token: unknown, key: unknown, res: any[]): any {
	switch (token) {
		case "AVG":{
			let total = new Decimal(0);
			for (const r of res) {
				total = total.add(new Decimal(r.get(key) as number));
			}
			return Number((total.toNumber() / res.length).toFixed(2));
		}
		case "MAX":{
			return res.reduce((a,b) => Math.max(a, b.get(key) as number), -Infinity);
		}
		case "MIN":{
			return res.reduce((a,b) => Math.min(a, b.get(key) as number), Infinity);
		}
		case "SUM":{
			return (res.reduce((a,b) => a + b.get(key), 0)).toFixed(2);
		}
		default: {
			return new Set(res.map((item) => item.get(key))).size;
		}
	}
}

function applyObject(m: any, o: Options) {
	let result: InsightResult[] = [];
	let c = Object.values(o)[0];
	for (const [key, value] of m) {
		let str = "{";
		for (const item of c) {
			if (item.includes("_")) {
				str = str.concat(analyzeKey(key.split("|")[0], item));
			} else {
				for (let i = 1; i < key.split("|").length; i++) {
					if (key.split("|")[i] === item) {
						str = str.concat(`"${key.split("|")[i]}" : ${value[i - 1]}, `);
					}
				}
			}
		}
		str = str.slice(0, -2);
		str = str.concat("}");
		result.push(JSON.parse(str));
	}
	return result;
}

function analyzeKey(k: any, ck: any): string {
	let str = "";
	for (const s of k.split("$")) {
		if (s.split("@")[0] === ck.split("_")[1]) {
			let v = s.split("@")[1];
			if (isNaN(Number(v)) || s.split("@")[0] === "uuid" || s.split("@")[0] === "id"
				|| s.split("@")[0] === "number" || v === "") {
				str = str.concat(`"${ck}" : "${v}", `);
			} else {
				str = str.concat(`"${ck}" : ${v}, `);
			}
		}
	}
	return str;
}

