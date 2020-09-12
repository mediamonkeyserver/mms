//Extremely basic registry that can cache a list of queries with their time-to-execute, for later processing/analysis
class PerformanceMonitor {
	
	constructor(){
		this.list = [];
	}
	
	addItem(item) {
		this.list.push(item);
	}
	
	dump() {
		return JSON.stringify(this.list);
	}
	
	/**
	 * @returns {Number} Current time in milliseconds, with fractional precision
	 */
	currentTimeMS(){
		var dt = process.hrtime();
		return dt[1]/1000000 + 1000*dt[0];
	}
}

module.exports = new PerformanceMonitor();