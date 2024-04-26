import http from "node:http";


const teamNumber = 163; // Replace with your actual team number
interface GeoResponse {

    lat?: number;

    lon?: number;

    error?: string;
}


export default class Room {

	private readonly fullname: string;
	private readonly shortname: string;
	private readonly address: string;
	private readonly number: string;
	private readonly name: string;
	private readonly lat;
	private readonly lon;
	private readonly seats: number;
	private readonly type: string;
	private readonly furniture: string;
	private readonly href: string;

	constructor(full: any, short: any, address: any, number: any, href: any, type: any, seats: any, furniture: any
		, geo: GeoResponse) {

		this.fullname = full;
		this.shortname = short;
		this.address = address;
		this.number = number;
		this.href = href;
		this.type = type;
		this.furniture = furniture;
		this.seats = parseInt(seats, 10);
		this.lat = geo.lat;
		this.lon = geo.lon;
		this.name = `${this.shortname}_${this.number}`;
	}

	public get(s: string): string | number {
		switch (s) {
			case "fullname": {
				return this.fullname;
			}
			case "shortname": {
				return this.shortname;
			}
			case "address": {
				return this.address;
			}
			case "number": {
				return this.number;
			}
			case "href": {
				return this.href;
			}
			case "type": {
				return this.type;
			}
			case "furniture": {
				return this.furniture;
			}
			case "seats": {
				return this.seats;
			}
			case "lat": {
				return this.lat as number;
			}
			case "lon": {
				return this.lon as number;
			}
			default: {
				return this.shortname + "_" + this.number;
			}
		}
	}
}
