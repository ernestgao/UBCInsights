import e from "express";

export type IdString = string;
export type ApplyKey = string;
export type AnyKey = Key|ApplyKey;
export type KeyList =  Key[];
export type Key = MKey | SKey;
export type MKey = `${IdString}_${SectionMField}`| `${IdString}_${RoomMField}`;
export type SKey = `${IdString}_${SectionSField}` |`${IdString}_${RoomSField}` ;
export type Logic = "AND" | "OR";
export type MComparator = "LT" | "GT" | "EQ";

export type SectionMField = "avg" | "pass" | "fail" | "audit" | "year"
export type SectionSField = "dept" | "id" | "instructor" | "title" | "uuid"
export type RoomMField = "lat" | "lon" | "seats";
export type RoomSField = "fullname" | "shortname" | "number" | "name" |"address" | "furniture" | "type" | "href";
export type Group = KeyList;
export type APPLYRULELIST =   APPLYRULE[];
export type APPLYTOKEN = "MAX" | "MIN" | "AVG" | "COUNT" | "SUM";
export type Filter = LogicComparison | MComparison | SCOMPARISON | Negation;
export type Direction = "UP" | "DOWN"


export type APPLYRULE = {[key in ApplyKey]: {
	[field in APPLYTOKEN]: Key}
}

export type LogicComparison ={
	[ key in Logic]: Filter[] ;
}
export type MComparison = {
	[key in MComparator]: {
		[field in MKey]: number;
	};
}
export interface Query {
	WHERE: Filter;
	OPTIONS: Options;
	TRANSFORMATIONS?: Transformations;
}
export interface Options {
	COLUMNS: AnyKey[] ; // An array of column names
	ORDER?: SORT|AnyKey;   // Optional ordering key
}
export interface Transformations {
	GROUP: Group;
	APPLY: APPLYRULELIST;
}


export interface SCOMPARISON {
	IS: {
		[key in SKey]: string;
	};
}
export interface Negation {
	NOT: Filter;
}
export interface SORT {
	dir: Direction;
	keys: AnyKey[]
}
