(function (global, factory) {

'use strict';

if (typeof module === 'object' && typeof module.exports === 'object') {
		// Export annualWheel as a module
	module.exports = global.document ?
			factory (global) :
		function (win) {
			if (!win.document) {
				throw new Error('annualWheel needs a window with document');
			}
			return factory(win);
		}
		return;
	}

	// Default use (no module export)
	factory(global);

})(typeof window !== 'undefined' ? window : this, function (window) { // BEGIN factory

'use strict';


//begin annual code

const MARGIN = 10;
const CORNER_RADIUS = 10;

const spiralGraph = (configureJson, selector) => {
	///
	let startDate = configureJson.start;
	let endDate = configureJson.end;
	let targetStartDate = startDate;
	let targetEndDate = endDate;
	const dateTypes = ['years','year', 'quarter', 'month', 'week', 'day'];
	let ringStatus = {
		'year': {
			show: configureJson?.rings?.date?.year?.show ?? false,
			category: 'year'
		},
		'quarter': {
			show: configureJson?.rings?.date?.quarter?.show ?? false,
			category: 'quarter'
		},
		'month': {
			show: configureJson?.rings?.date?.month?.show ?? false,
			category: 'month'
		},
		'week': {
			show: configureJson?.rings?.date?.week?.show ?? false,
			category: 'week'
		},
		'day': {
			show: configureJson?.rings?.date?.day?.show ?? false,
			category: 'day'
		}
	};
	let categoryStatus = {};

	configureJson?.rings?.data?.dataRings.forEach((item) => {
		categoryStatus[item.category] = {
			show: true,
			types: []
		}
		item?.types.forEach((type) => {
			categoryStatus[item.category].types.push(type.type)
			ringStatus[type.type] = {
				show: type?.show ?? false,
				category: item?.category,
				...(type?.margin ? {margin: type?.margin} : null),
				...(type?.round ? {round: type?.round} : null),
				color: type?.color
			}
		});
	});

	var generateHierarchyDates = (configureJson) => {
		const start = configureJson.start;
		const end = configureJson.end;
		const data = {
			years: {
				name: 'years',
				children:[],
			},
			months: {
				name: 'months',
				children:[],
			},
			weeks: {
				name: 'weeks',
				children:[],
			},
			quarters: {
				name: 'quarters',
				children:[],
			},
			days: {
				name: 'days',
				children:[],
			}
		};
		
		const operateOnDate=(selectedDate)=>{
			const year = moment(selectedDate).format("YYYY");
			const quarter = moment(selectedDate).format("YYYY-[Q]Q");
			const month = moment(selectedDate).format("YYYY-MM");
			const date = moment(selectedDate).format("DD");
			const week = moment(selectedDate).format('[W]WW');

			let selectedYearItem = null;

			const yearIndex = data.years.children.findIndex((value) =>  value.name === year);
			if(yearIndex > -1){
				selectedYearItem = data.years.children[yearIndex];
				selectedYearItem.value++;
			}else{
				const visible = configureJson.rings?.date?.year?.show ?? true;
				selectedYearItem = {
					type: 'year',
					category: 'year',
					name: year,
					value: 1,
					startDate: `${month}-${date}`,
					visible
				}

				data.years.children.push(selectedYearItem);
			}

			let selectedQuarterItem = null;
			const quarterIndex = data.quarters.children.findIndex((value) =>  value.name === quarter)
			if(quarterIndex > -1){
				selectedQuarterItem = data.quarters.children[quarterIndex];
				selectedQuarterItem.value++;
			}else{
				const visible = configureJson.rings?.date?.quarter?.show ?? true;
				selectedQuarterItem = {
					type: 'quarter',
					category: 'quarter',
					name: quarter,
					value: 1,
					startDate: `${month}-${date}`,
					visible
				}

				data.quarters.children.push(selectedQuarterItem);
			}

			let selectedMonthItem = null;
			const monthIndex = data.months.children.findIndex((value) =>  value.name === month)
			if(monthIndex > -1){
				selectedMonthItem =  data.months.children[monthIndex];
				selectedMonthItem.value ++;
			}else{
				const visible = configureJson.rings?.date?.month?.show ?? true;
				selectedMonthItem = {
					type: 'month',
					category: 'month',
					name: month,
					value: 1,
					startDate: `${month}-${date}`,
					visible
				}

				data.months.children.push(selectedMonthItem);
			}

			let selectedWeekItem = null;
			
			const prevWeekString = data.weeks.children[data.weeks.children.length - 1]?.name;
			if(prevWeekString == week){
				selectedWeekItem =  data.weeks.children[data.weeks.children.length - 1];
				selectedWeekItem.value ++;
			}else{
				const visible = configureJson.rings?.date?.week?.show ?? true;
				selectedWeekItem = {
					category: 'week',
					type: 'week',
					name: week,
					value: 1,
					startDate: `${month}-${date}`,
					visible
				}

				data.weeks.children.push(selectedWeekItem);
			}

			const visible = configureJson.rings?.date?.day?.show ?? true;
			let selectedDayItem = {
				category: 'day',
				type: 'day',
				name: `${month}-${date}`,
				value: 1,
				visible
			};
			data.days.children.push(selectedDayItem);

			configureJson.rings.data.dataRings.forEach((item, index) => {
				item?.types?.forEach((subRingItem, subIndex) =>{
					let dataContent = {
						category: item?.category,
						type: subRingItem?.type ?? "",
						startDate: `${month}-${date}`,
						name:  subRingItem?.type ?? "",
						visible: subRingItem?.show,
						value: 1
					}
					if(!data[subRingItem?.type]){
						data[subRingItem?.type] = {
							name:subRingItem?.type,
							children: []
						}
					}
					data[subRingItem?.type].children.push(dataContent);
				});	
			})
		}

		const startDay = moment(start);
		const endDay = moment(end);

		let currentDate  = startDay.clone();
		while (currentDate.isSameOrBefore(endDay)) {
			operateOnDate(currentDate.format("YYYY-MM-DD"))
			currentDate.add(1, 'day');
		}

		return data;
	}


	const partition = (data, padding = 0) => {
		const root = d3.hierarchy(data)
			.sum(d => {
				if(d?.value) return d?.value;
				else return 0;
			});
		return d3.partition()
			.size([2 * Math.PI - 0.15, 0])
			.padding(padding)
			(root);
	}

	const backgroundRing = {
		type: 'background',
		category: 'background',
		show: true,
		x0: 0,
		x1: Math.PI * 2
	};

	const shadow = {
		type: 'shadow',
		category: 'shadow',
		show: true,
		x0: 0,
		x1: Math.PI * 2
	};
	shadow.current = shadow;
	backgroundRing.current = backgroundRing;

	const data = generateHierarchyDates(configureJson)
	const yearPartition = partition(data.years);
	const monthPartition = partition(data.months);
	const weekPartition = partition(data.weeks);
	const dayPartition = partition(data.days);
	const quarterPartition = partition(data.quarters);
	yearPartition.each(d => {
		d.current = d
	});
	monthPartition.each(d => {
		d.current = d
	});
	weekPartition.each(d => {
		d.current = d
	});
	dayPartition.each(d => {
		d.current = d
	});
	quarterPartition.each(d => {
		d.current = d
	});

	let items = [];
	Object.entries(data).forEach(([key, value], index)=>{
		if(index >= 5) {
			let arrayData = partition(value).each(d => {
				d.current = d
			}).descendants().slice(1);

			items = items.concat(arrayData);
		}
	})
	configureJson.rings.data.dataRings.forEach((category)=>{
		let dataRing = {
			depth: 0,
			value: 1,
			x0: 0,
			x1: Math.PI * 2,
			y0: 0,
			y1: 0,
			data:{
				name: category?.category,
				type: category?.category,
				visible: true,
				dataTitle: true,
				category: category?.category,
			},
			parent: null
		}
		dataRing.current = dataRing;
		///title ring part
		items.push(dataRing)
	});

	items = [
		backgroundRing,
		...yearPartition.descendants().slice(1),
		...quarterPartition.descendants().slice(1),
		...monthPartition.descendants().slice(1),
		...weekPartition.descendants().slice(1),
		...dayPartition.descendants().slice(1),
		...items,
	]
	const dataContentRings = [];
	configureJson.rings.data.items.forEach((item, index) => {
			let x0 = 0, x1 = 1;
			x0 = Math.max(0, Math.min(Math.PI * 2, Math.PI * 2 / (moment(configureJson.end).diff(moment(configureJson.start), 'days') + 1) * moment(item?.start).diff(moment(configureJson.start), 'days')));
			if(x0 >= Math.PI * 2) x0 -= (Math.PI * 2)
			x1 = Math.max(0, Math.min(Math.PI * 2, Math.PI * 2 / (moment(configureJson.end).diff(moment(configureJson.start), 'days') + 1) * (moment(item?.end).diff(moment(configureJson.start), 'days') +1) ))
			const type = item?.type;
			let newData = {
				title: item.title,
				startDate: item?.start,
				endDate: item?.end,
				category: ringStatus[type]?.category,
				type:  type,
				"text-direction": item['text-direction'],
				show: ringStatus[type]?.show,
				color: ringStatus[type]?.color,
				...(ringStatus[type].margin ? {margin: ringStatus[type].margin} : null),
				...(ringStatus[type].round ? {round: ringStatus[type].round} : null),
				data: true,
				dataIndex: items.length + dataContentRings.length,
				x0,
				x1
			};
			
			newData.current = newData
			dataContentRings.push(newData);
			if(item['text-direction'] == "inside-out"){
				let newDataForTextPath = {...newData};
				newDataForTextPath.insideOut = true;
				newDataForTextPath.current = newDataForTextPath;
				newDataForTextPath.dataIndex =  items.length + dataContentRings.length - 1,
				dataContentRings.push(newDataForTextPath);
			}
	});

	items = [
		...items,
		...dataContentRings,
		shadow,
	];

	items.forEach((item, index) => {
		item.visible = item?.data?.visible || item.show, item.index = index
	})

	const startSpiralAngle = 0;
	const format = d3.format(",d");
	const width = parseFloat(d3.select(selector).attr("w"))

	

	var scaleLinear = d3.scaleLinear()
			.domain([0, Math.PI * 2])
			.range([0,0.05])


	const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, 10));


	const getDateRingRadius = (data) =>{
		if(!data) return 0;
		let height = 0;
		const type = data?.data?.type || data.type;
		if(dateTypes.includes(type)){
			if(ringStatus.day.show) height++;
			if(type === 'day') return height;

			if(ringStatus.week.show) height++;
			if(type === 'week') return height;

			if(ringStatus.month.show) height++;
			if(type === 'month') return height;

			if(ringStatus.quarter.show) height++;
			if(type === 'quarter') return height;

			if(ringStatus.year.show) height++;
			if(type === 'year') return height;
		}
		return 0;
	}

	const getDataRingRadius = (data) =>{
		if(!data) return 0;
		let height = 0;
		const type = data.data?.type || data.type;
		if(!dateTypes.includes(type)){
			if(data?.data?.dataTitle || data?.dataTitle){
				const ringEntries = Object.entries(ringStatus).reverse();
				let startedCategory = false;
				for(let i=0;i<ringEntries.length - 5; i++){
					if(startedCategory && ringEntries[i][1].category != type) return height;
					if(ringEntries[i][1].show) height++;
					if(!startedCategory && type == ringEntries[i][1].category) startedCategory = true;
				}
			}else{
				const ringEntries = Object.entries(ringStatus).reverse();
				for(let i=0;i<ringEntries.length - 5; i++){
					if(ringEntries[i][1].show) height++;
					if(ringEntries[i][0] == type) return height;
				}
			}
		}
		return height;
	}

	const getDataTitleRadiusHeight = (data) => {
		let height = 0;
		const categoryName = data?.data?.category || data?.category;
		const reversed = Object.entries(categoryStatus).reverse()
		for(let i = 0; i< reversed.length; i++){
			if(reversed[i][1].show) height++;
			if(reversed[i][0] == categoryName) return height;
		}
	}

	const getDataTitleHeight = () => {
		return Object.entries(categoryStatus).reduce((total, [key, value], index) => {
			if(value?.show) 	total++
			return total;
		}, 0);
	}
	const getDataHeight = () =>{
		let height = 0;
		const ringEntries = Object.entries(ringStatus).reverse();
		for(let i=0;i<ringEntries.length - 5; i++){
			if(ringEntries[i][1].show) height++;
		}
		return height;
	}

	const getDateHeight = () =>{
		
		let height = 0;
		const ringEntries = Object.entries(ringStatus);
		for(let i=0;i<5; i++){
			if(ringEntries[i][1].show) height++;
		}
		return height;
	}

	const getPad = (d) =>{
		const type = d?.type || d?.data?.type;
		if(type === 'background') return dataRadius + titleRingWidth * getDateHeight();
		
		let pad = 0;
		
		if(dateTypes.includes(type))
			pad = titleRingWidth;
		else {
			if(d?.data?.dataTitle || d?.dataTitle){
				pad = titleRingWidth
			}else
				pad = (dataRadius - getDataTitleHeight() * titleRingWidth) * 1.0 / getDataHeight()
		}
		return pad
	}
	const getRadius = (d) => {
		let radius = 0;
		const type = d?.type || d?.data?.type;
		if(type === 'background' || type === 'shadow') return holeRadius;
		if(dateTypes.includes(type))
			radius = holeRadius + dataRadius + getDateRingRadius(d) * titleRingWidth - titleRingWidth;
		else {
			if(d?.data?.dataTitle || d?.dataTitle){
				radius = holeRadius + (dataRadius - getDataTitleHeight() * titleRingWidth) * 1.0 / getDataHeight() * getDataRingRadius(d) + titleRingWidth* getDataTitleRadiusHeight(d) -  titleRingWidth ;
			}else{
				if(d?.data == true){
					radius = holeRadius + (dataRadius - getDataTitleHeight() * titleRingWidth) * 1.0 / getDataHeight() * (getDataRingRadius(d) - 1) + titleRingWidth* (getDataTitleRadiusHeight(d) - 1) ;
				}else {
					radius = holeRadius + (dataRadius - getDataTitleHeight() * titleRingWidth) * 1.0 / getDataHeight() * (getDataRingRadius(d) - 1) + titleRingWidth* (getDataTitleRadiusHeight(d) - 1) ;
				}
			}
		}
		return radius
	}

	const titleRingWidth = 11;
	const holeRadius = width * configureJson.innerHoleRadius
	const totalRadius = (width / 2 + 90 - holeRadius) / (1 + scaleLinear(Math.PI * 2)) - 2
	const dataRadius = totalRadius - titleRingWidth * getDateHeight()
	

	let previousStates = [{
		startDate,
		endDate,
		ringStatus: JSON.parse(JSON.stringify(ringStatus)),
		categoryStatus: JSON.parse(JSON.stringify(categoryStatus))
	}];

	function xPos (angle, radius) {
			// change to clockwise
			let a = Math.PI * 2 - angle
			// start from 12 o'clock
			a = a + Math.PI - startSpiralAngle;
			return radius * Math.sin(a)
	}

	function yPos (angle, radius) {
			// change to clockwise
			let a = Math.PI * 2 - angle
			// start from 12 o'clock
			a = a + Math.PI - startSpiralAngle;
			return radius * Math.cos(a)
	}

	const arc2 = ( {startAngle, endAngle, startInnerRadius, endInnerRadius, startOuterRadius, endOuterRadius} ) => {
		const polarToCartesian = (angle, radius) => ({
			x: radius * Math.cos(angle),
			y: radius * Math.sin(angle),
		});

		const outerStart = polarToCartesian(startAngle, startOuterRadius);
		const outerEnd = polarToCartesian(endAngle, endOuterRadius);

		const innerStart = polarToCartesian(startAngle, startInnerRadius);
		const innerEnd = polarToCartesian(endAngle, endInnerRadius);

		return `
    M ${innerStart.x},${innerStart.y}
    A ${startInnerRadius},${startInnerRadius} 0 0,1 ${innerEnd.x},${innerEnd.y}
    L ${outerEnd.x},${outerEnd.y}
    A ${endOuterRadius},${endOuterRadius} 0 0,0 ${outerStart.x},${outerStart.y}
    Z
  `;
	}

	const arc1 = (d) => {

		const margin = d.margin ? MARGIN : 0;

		let startAngle = d.x0;
		let endAngle = d.x1;
		let radius = getRadius(d);
		let pad = getPad(d);

		let startInnerRadius = margin + radius + scaleLinear(startAngle) * (radius - holeRadius);
		let endInnerRadius = margin + radius + scaleLinear(endAngle) * (radius - holeRadius);
		let startOuterRadius = -1 * margin + pad + radius + scaleLinear(startAngle) * (radius - holeRadius + pad);
		let endOuterRadius = -1 * margin + pad + radius + scaleLinear(endAngle) * (radius - holeRadius + pad);
		let arcAngle = endAngle - startAngle;

		const insideOut = (d?.data?.insideOut || d?.insideOut);
		if(insideOut){
			let innerRadius = radius + scaleLinear((d.x0 + d.x1)/2) * (radius - holeRadius);
			let outerRadius = innerRadius + pad;
			const x0 = xPos((d.x0 + d.x1)/2, innerRadius)
			const y0 = yPos((d.x0 + d.x1)/2, innerRadius)
			const x1 = xPos((d.x0 + d.x1)/2, outerRadius)
			const y1 = yPos((d.x0 + d.x1)/2, outerRadius)
			if((d.x0 + d.x1)/2 <= Math.PI)
				return `M${x0},${y0} L${x1},${y1} Z`;
			return `M${x1},${y1} L${x0},${y0} Z`; 
		}
		const type1 = (d?.data?.type || d?.type);
		if(type1 == 'shadow'){
			return `M${Math.sin(Math.PI/4) * holeRadius},${Math.sin(Math.PI/4) * holeRadius} 
			L${Math.sin(Math.PI/4)*(holeRadius + (scaleLinear(Math.PI*2) + 1) * (dataRadius + titleRingWidth * getDateHeight()))}, ${Math.sin(Math.PI/4)*(holeRadius + (scaleLinear(Math.PI*2) + 1) * (dataRadius + titleRingWidth * getDateHeight()))}
			L${Math.sin(Math.PI/4)*(holeRadius + (scaleLinear(Math.PI*2) + 1) * (dataRadius + titleRingWidth * getDateHeight())) - 8}, ${Math.sin(Math.PI/4)*(holeRadius + (scaleLinear(Math.PI*2) + 1) * (dataRadius + titleRingWidth * getDateHeight())) + 2}
			L${Math.sin(Math.PI/4) * holeRadius - 2},${Math.sin(Math.PI/4) * holeRadius + 2}
			Z`;
		}
		if(!d?.visible) return '';

		const controlPointCount = Math.ceil(arcAngle / (Math.PI / 36))

					// CURVE CONTROL POINTS
		let arcData = {
			x1 : xPos(startAngle, startInnerRadius),
			y1 : yPos(startAngle, startInnerRadius),
			x2 : xPos(endAngle, endInnerRadius),
			y2 : yPos(endAngle, endInnerRadius),
			x3 : xPos(endAngle, endOuterRadius),
			y3 : yPos(endAngle, endOuterRadius),
			x4 : xPos(startAngle, startOuterRadius),
			y4 : yPos(startAngle, startOuterRadius),
		};
		const innerControlPoints = [[arcData.x1, arcData.y1]];
		const outerControlPoints = [[arcData.x3, arcData.y3]];

		for (let i = 1; i < controlPointCount; i++) {
		// Calculate the current angle
		const angle = startAngle + arcAngle * 1.0 / controlPointCount * i;
			const outerAngule = endAngle - arcAngle * 1.0 / controlPointCount * i
			// Determine the distance of the control point from the center
			const innerDistance =  radius + scaleLinear(angle) * (radius - holeRadius);
			const outerDistance =  radius + pad + scaleLinear(outerAngule) * (radius - holeRadius + pad);
			// Calculate the x and y coordinates of the control point
			const innerX = xPos(angle, innerDistance + margin)
			const innerY = yPos(angle, innerDistance + margin)

			const outerX = xPos(outerAngule, outerDistance - margin)
			const outerY = yPos(outerAngule, outerDistance - margin);
			// Add the control point to the array
			innerControlPoints.push([innerX, innerY])
			outerControlPoints.push([outerX, outerY])
		}

		innerControlPoints.push([arcData.x2, arcData.y2])
		outerControlPoints.push([arcData.x4, arcData.y4])

		arcData = {
			...arcData,
			innerControlPoints,
			outerControlPoints
		}

		///drawing part

		if((startAngle + endAngle) / 2 > 90 * Math.PI/180 && (startAngle + endAngle) / 2 < 270 * Math.PI/180){
			let tx1 = arcData.x1, ty1 = arcData.y1;
			arcData.x1 = arcData.x2; arcData.y1 = arcData.y2;
			arcData.x2 = tx1; arcData.y2 = ty1;
			
			let tx3 = arcData.x3, ty3 = arcData.y3;
			arcData.x3 = arcData.x4; arcData.y3 = arcData.y4;
			arcData.x4 = tx3; arcData.y4 = ty3;

			arcData.innerControlPoints.reverse();
			arcData.outerControlPoints.reverse();
		}
		let start = 'M ' + arcData.x1 + ' ' + arcData.y1
		// inner curve to vertice 2
		
		let side1 = arcData.innerControlPoints.reduce((spline, point, index) =>{
			if(index > 0 && arcData.innerControlPoints[index - 1] && arcData.innerControlPoints[index])
				return `${spline} Q ${arcData.innerControlPoints[index - 1]},${arcData.innerControlPoints[index - 1]} ${arcData.innerControlPoints[index]},${arcData.innerControlPoints[index]}`;
			else return spline;
		},'')
		let side2 = 'L ' + arcData.x3 + ' ' + arcData.y3
		// outer curve vertice 4
		let side3 = arcData.outerControlPoints.reduce((spline, point, index) =>{
			if(index > 0 && arcData.outerControlPoints[index - 1] && arcData.outerControlPoints[index])
				return `${spline} Q ${arcData.outerControlPoints[index - 1]},${arcData.outerControlPoints[index - 1]} ${arcData.outerControlPoints[index]},${arcData.outerControlPoints[index]}`;
			else return spline;
		},'')

		return start + ' ' + side1 + ' ' + side2 + ' ' + side3 + ' Z'
		// return d?.type?.includes('Internal HR')
		// 	? arc2({startAngle, endAngle, startInnerRadius, endInnerRadius, startOuterRadius, endOuterRadius})
		// 	: start + ' ' + side1 + ' ' + side2 + ' ' + side3 + ' Z'
	}

	const svg = d3.select(selector)
	.attr("viewBox", [0, 0, width + 180, width + 180])
	.style("font", "10px sans-serif")
	.classed("diagram", true)
	.classed("diagram-annualwheel", true)


	const g = svg.append("g")
	.attr("transform", `translate(${width / 2 + 90},${width / 2 + 90})`);


	var gradient = svg.append("defs")
		.append("linearGradient")
		.attr("id", "myGradient")
		.attr("x1", "100%") // starting point (left)
		.attr("y1", "50%")
		.attr("x2", "0%") // ending point (right)
		.attr("y2", "100%");
	
		gradient.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", "#00000060"); // starting color
		
		gradient.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", "#00000000");
		
	const path = g.append("g")
		.selectAll("path")
		.data(items)
		.enter()
		.append("path")
		.attr("id", (d,index)=>{
			return `arc-path${index}`;
		})
		.attr("fill", d => {
			const type = d?.data?.type || d?.type;
			if(type == "shadow") return "url(#myGradient)"
			if(type != 'background'){
				if(d?.color){ return d?.color;}
				if(dateTypes.includes(d?.data?.type) || d?.data?.dataTitle) return '#ffffff26'; 
				return color(type); 
			}else{
				return "#FFFFFF36"
			}
		})
		// .attr("fill-opacity", d => arcVisible(d.current) ? 0.9 : 0)
		// .attr("stroke-opacity", d => arcVisible(d.current) ? 0.9 : 0)
		.attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
		.attr("d", d => arc1(d))
		.attr("stroke", d => {
			const type = d?.type || d?.data?.type;
			if(type =='shadow') return '#AAAAAA';
			return arcVisible(d.current) && d.current.depth > 0 ? "#AAAAAA" :
				d?.type?.includes('Internal HR') ? (d?.color || "none") : "none"
		})
		.attr("stroke-width", d => d?.round ? CORNER_RADIUS :0.2)
		.attr("stroke-linecap", d => d?.round ? "round" : "butt")
		.attr("stroke-linejoin", d => d?.round ? "round" : "butt")
		.attr("class", d => {
			const type = d?.data?.type || d?.type;
			if(type == 'year')
				return 'diagram-date diagram-date-years';
			if(type == 'quarter') return 'diagram-date diagram-date-quarters';
			if(type == 'month') return 'diagram-date diagram-date-months';
			if(type == 'week') return 'diagram-date diagram-date-weeks';
			if(type == 'day') return 'diagram-date diagram-date-days';

			let classes = "";
			if(!dateTypes.includes(type)){
				classes += "diagram-section";
			} 
			if(d?.data?.dataTitle){
				classes += " diagram-title";
			}

			if(d?.data == true){
				classes += " diagram-data"
			}
			if(type == 'background') classes += " diagram-background"
			return classes;
		})
		.classed("diagram-bg", true)
		.attr("filter", (d)=>{ const type = d?.type || d?.data?.type; if(type =='shadow') return 'url(#custom)'; else return null;})
		.attr("transform", d=>{
			const type = d?.type || d?.data?.type; 
			if(type =='shadow') 
				return "rotate(225)"; 
			return "rotate(0)"
		})
		.style("cursor", "pointer")
		.classed("dataItem", d => d?.data == true ? true : false)
		.on("click", clicked);

	

	path.append("title")
		.text(d => {
			if(d?.ancestors){
				return `${d?.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`
			}else{
				return d?.data?.type
			}
		})
		.attr('class', 'diagram-text')
	
	const defs = g.append("defs").attr("class", "defs-element")
	defs.html(`
	<filter class="shadow-filter-element" id="custom" height="200%" width="200%">
	<feGaussianBlur class="feGaussianBlur-element" in="SourceAlpha" stdDeviation="2" result="blur"></feGaussianBlur>
	<feOffset class="feOffset-element" in="blur" result="offsetBlur" dx="-1" dy="1" x="2" y="2"></feOffset>
	<feFlood class="feFlood-element" in="offsetBlur" flood-color="black" flood-opacity="1" result="offsetColor"></feFlood>
	<feComposite class="feComposite-element" in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur"></feComposite>
	<feMerge class="feMerge-element"><feMergeNode class="feMergeNode-blur" in="offsetBlur"></feMergeNode>
	<feMergeNode class="feMergeNode-graphic" in="SourceGraphic"></feMergeNode></feMerge>
</filter>
	`);

	///display parent circle(center)
	const parent = g.append("circle")
		// .datum(root)
		.attr("r", holeRadius)
		.attr("fill", "none")
		.attr("pointer-events", "all")
		.attr("fill","white")
		.on("click", parentClicked)

	//display labels
	const labelItems = items.filter((item, index)=>{
		const type = item?.type || item?.data?.type;
		if(item?.data?.dataTitle || item?.data?.data == true || item?.data == true) return true;
		if(dateTypes.includes(type)) return true;
		return false;
	});

	const label = g
		.append("g")
		.selectAll("g")
		.data(labelItems)
		.enter()
		.append("text")
		// .attr("x", 5)   //Move the text from the start angle of the arc
		.attr("dy", (d)=>{
			const textDirection = d['text-direction'] || d.data['text-direction']
			if(textDirection == 'inside-out') return
			const margin = d.margin ? MARGIN : 0;
			if((d.x0 + d.x1) / 2 > 90 * Math.PI/180 && (d.x0 + d.x1) / 2 < 270 * Math.PI/180){
				return 0.5 * getPad(d) + margin;
			}else return -0.5 * getPad(d) + margin
		})
		.classed("dataItem", d => d?.data == true ? true : false)


	const labelPath = label.append("textPath")
		.attr("xlink:href", (d, index)=>{
			const textDirection = d['text-direction'] || d.data['text-direction']
			if(textDirection !== 'inside-out' || d?.insideOut)  
				return `#arc-path${d.index}`
			else{
				return `#arc-path333333`;
			}
		})
		.text(d => {
			if(((d.x1 - d.x0) / Math.PI * 180 > 2) ){
				if(d?.data == true && d?.show) return d?.title;
				if(ringStatus['day'].show && d?.data?.type == 'day') return moment(d?.data?.name).format("DD")
				if(dateTypes.includes(d?.data?.type) || d?.data?.dataTitle) return d.data.name;
			}
			else return null;
		})
		.style("text-anchor", (d)=>{
			const textDirection = d['text-direction'] || d.data['text-direction']
			if(textDirection !== 'inside-out') 
				return "middle" 
			if((d.x0 + d.x1)/2 <= Math.PI)
				return "start"
			else return "end"
		})
		.attr("startOffset", (d)=>{
			const textDirection = d['text-direction'] || d.data['text-direction']
			const type = d?.data?.type || d?.type;
			if(type == "shadow" || textDirection){
				if((d.x0 + d.x1)/2 <= Math.PI){
					return "2px";
				}else {
					return "48%"
				}				
			}
			else return (getRadius(d) * (d.x1 - d.x0) / 2)+"px";
		})
		.attr('dominant-baseline', 'middle') 
		.on("click", (d, index)=>{
			d3.select("#arc-path"+d.index).dispatch("click")
		})
		.style("cursor", "pointer")
		.classed("diagram-text", true)
		.style('user-select', 'none')
		.style('-moz-user-select', 'none')
		.style('-webkit-user-select', 'none')
		.style('-ms-user-select', 'none');

	
	function parentClicked(){
		if(previousStates.length > 1){
			let newStatus = previousStates.pop();
			newStatus = previousStates.pop()
			ringStatus = newStatus.ringStatus;
			categoryStatus = newStatus.categoryStatus;
			items.forEach((item) => {
				const prev = item.prevs.pop();
				let x0 = prev.x0;
				let x1 = prev.x1; 
				if(item?.data == true){
					let startDate = item?.data?.startDate || item?.startDate; 
					x0 = Math.max(0, Math.min(Math.PI * 2, Math.PI * 2 / (moment(newStatus.endDate).diff(moment(newStatus.startDate), 'days') + 1) * moment(startDate).diff(moment(newStatus.startDate), 'days')));
					if(x0 >= Math.PI * 2) x0 -= (Math.PI * 2)
					if(item?.data?.value)
						x1 = x0 + Math.max(0, Math.min(Math.PI * 2, Math.PI * 2 / (moment(newStatus.endDate).diff(moment(newStatus.startDate), 'days') + 1) * item?.data?.value ))
					else{
						let endDate = item?.data?.endDate || item?.endDate;
						endDate = moment(endDate).isSameOrBefore(moment(newStatus.endDate)) ? endDate : newStatus.endDate;
						x1 = Math.max(0, Math.min(Math.PI * 2, Math.PI * 2 / (moment(newStatus.endDate).diff(moment(newStatus.startDate), 'days') + 1) *  (moment(endDate).diff(moment(newStatus.startDate), 'days') + 1)))
					}
				}
				let visible = prev.visible;
				item.target = {
					x0,
					x1,
					visible,
					type: item?.data?.type || item?.type,
					dataTitle: item?.data?.dataTitle ?? false,
					category: item?.category || item?.data?.category,
					insideOut: item?.insideOut || item?.data?.insideOut,
					"text-direction": item["text-direction"]
				};
			});


			const t = g.transition().duration(750);


			path.transition(t)
				.tween("data", d => {
				const i = d3.interpolate(d.current, d.target);
				return t => d.current = i(t);
				})
			.filter(function(d) {
				return +this.getAttribute("fill-opacity") || arcVisible(d.target);
			})
			.attr("fill-opacity", d => arcVisible(d.target) ? 0.9 : 0)
			.attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
				.attrTween("d", d => () => arc1(d.current))
				.attr("stroke-width", 0.2) 

			label.attr("fill-opacity", d => arcVisible(d.target) ? 1 : 0)
			.transition(t)
			.attr("dy", (d)=>{
				const textDirection = d['text-direction'] || d.data['text-direction']
				if(textDirection == 'inside-out') return 
				if((d.target.x0 + d.target.x1) / 2 > 90 * Math.PI/180 && (d.target.x0 + d.target.x1) / 2 < 270 * Math.PI/180){
					return 0.5 * getPad(d);
				}else return -0.5 * getPad(d)
			})
			.select("textPath")
			.style("text-anchor", (dd)=>{
				const d= dd.target;
				const textDirection = d['text-direction']
				if(textDirection !== 'inside-out') 
					return "middle" 
				if((d.x0 + d.x1)/2 <= Math.PI)
					return "start"
				else return "end"
			})
			.attr("startOffset", (dd)=>{
				const d= dd.target;
				const textDirection = d['text-direction']
				const type = d?.data?.type || d?.type;
				if(type == "shadow" || textDirection){
					if((d.x0 + d.x1)/2 <= Math.PI){
						return "2px";
					}else {
						return "48%"
					}				
				}
				else return (getRadius(d) * (d.x1 - d.x0) / 2)+"px";
			})
			previousStates.push(newStatus);
		}
	}

	function clicked(event, p) {
		console.log('clicked', event)
		if(!(dateTypes.includes(event?.data?.type) || event?.data?.dataTitle)) return;
		if(event?.data?.type == "day") return;
		const prevState = JSON.parse(JSON.stringify(previousStates[previousStates.length - 1]));
		
		let changed = false;
		if(targetStartDate != moment(prevState?.startDate).format("YYYY-MM-DD") || targetEndDate !=  moment(prevState?.endDate).format("YYYY-MM-DD"))
		changed = true;
		if(event?.data?.startDate){
			targetStartDate = moment(event?.data?.startDate).format("YYYY-MM-DD");
			targetEndDate = moment(event?.data?.startDate).add((event?.data?.value - 1) ?? 0, 'day').format("YYYY-MM-DD");
		}

		
		let newStatus;
		if(dateTypes.includes(event?.data?.type)){
			newStatus = {
				...prevState,
				startDate: targetStartDate,
				endDate: targetEndDate
			};
			Object.keys(newStatus.ringStatus).forEach((key) => {
				if(dateTypes.includes(key))
					newStatus.ringStatus[key].show = false;
			})
			newStatus.ringStatus[event?.data?.type] = {
				show: true
			};

		} 
		else 
		{
			newStatus = {
				...prevState,
				ringStatus: JSON.parse(JSON.stringify(prevState.ringStatus)),
				categoryStatus: JSON.parse(JSON.stringify(prevState.categoryStatus))
			};
			const categoryName = event?.data?.category;
			Object.keys(newStatus.categoryStatus).forEach((key) => {
				if(!dateTypes.includes(key)){
					if(key !== categoryName)
						newStatus.categoryStatus[key].show = false;
					else newStatus.categoryStatus[key].show = true;
				}
			});

			Object.entries(newStatus.ringStatus).forEach(([key, value]) => {
				if(!dateTypes.includes(key)){
					if(value?.category == categoryName)
						newStatus.ringStatus[key].show = true;
					else newStatus.ringStatus[key].show = false;
				}
			});

		}

		ringStatus = newStatus.ringStatus;
		categoryStatus = newStatus.categoryStatus;
		if(JSON.stringify(prevState) == JSON.stringify(newStatus) && !changed) return;
		items.forEach((item) => {

			let x0 = item?.current?.x0, x1 = item?.current?.x1;
			if(x0 != undefined && x1 != null && event?.x0 != undefined && event?.x1 != null && !event?.data?.dataTitle ){
				if(item?.data?.dataTitle){
					x0 = 0, x1 = Math.PI * 2;
				}else{
					let startDate = item?.data?.startDate || item?.startDate; 
					x0 = Math.max(0, Math.min(Math.PI * 2, Math.PI * 2 / (moment(newStatus.endDate).diff(moment(newStatus.startDate), 'days') + 1) * moment(startDate).diff(moment(newStatus.startDate), 'days')));
					if(x0 >= Math.PI * 2) x0 -= (Math.PI * 2)
					if(item?.data?.value)
						x1 = x0 + Math.max(0, Math.min(Math.PI * 2, Math.PI * 2 / (moment(newStatus.endDate).diff(moment(newStatus.startDate), 'days') + 1) * item?.data?.value ))
					else{
						let endDate = item?.data?.endDate || item?.endDate;
						endDate = moment(endDate).isSameOrBefore(moment(newStatus.endDate)) ? endDate : newStatus.endDate;
						x1 = Math.max(0, Math.min(Math.PI * 2, Math.PI * 2 / (moment(newStatus.endDate).diff(moment(newStatus.startDate), 'days') + 1) *  (moment(endDate).diff(moment(newStatus.startDate), 'days') + 1)))
					}
				}
			}

			if(!item.prevs){
				item.prevs = [{
					x0: item.current.x0,
					x1: item.current.x1,
					visible: item.current.visible,
				}]
			}else{
				item.prevs.push({
					x0: item.current.x0,
					x1: item.current.x1,
					visible: item.current.visible,
				})
			}

			const type = item?.data?.type || item?.type;
			if(type === 'background' || type === 'shadow'){
				x0 = 0; x1 = Math.PI * 2;
			}
			item.target = {
				x0,
				x1,
				type,
				visible: calculateVisible(item, newStatus),
				dataTitle: item?.data?.dataTitle ?? false,
				category: item?.category || item?.data?.category,
				insideOut: item?.insideOut,
				"text-direction": item["text-direction"]
			};
		});


		const t = g.transition().duration(750);


		path.transition(t)
			.tween("data", d => {
			const i = d3.interpolate(d.current, d.target);
			return t => d.current = i(t);
			})
		.filter(function(d) {
			return +this.getAttribute("fill-opacity") || arcVisible(d.target);
		})
			.attr("fill-opacity", d => arcVisible(d.target) ? 0.9 : 0)
			.attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
			.attrTween("d", d => () => arc1(d.current))

		label.attr("fill-opacity", d => arcVisible(d.target) ? 1 : 0)
		.transition(t)
		.tween("data", d => {
			const i = d3.interpolate(d.current, d.target);
			return t => d.current = i(t);
			})
		.attr("dy", (dd)=>{
			const d = dd?.target;
			const textDirection = d['text-direction'] || d.data?.['text-direction']
			if(textDirection == 'inside-out') return 
			if((d.x0 + d.x1) / 2 > 90 * Math.PI/180 && (d.x0 + d.x1) / 2 < 270 * Math.PI/180){
				return 0.5 * getPad(d);
			}else 
			return -0.5 * getPad(d)
		})
			.select("textPath")
			.style("text-anchor", (dd)=>{
				const d= dd.target;
				const textDirection = d['text-direction']
				if(textDirection !== 'inside-out') 
					return "middle" 
				if((d.x0 + d.x1)/2 <= Math.PI)
					return "start"
				else return "end"
			})
			.attr("startOffset", (dd)=>{
				const d= dd.target;
				const textDirection = d['text-direction']
				const type = d?.data?.type || d?.type;
				if(type == "shadow" || textDirection){
					if((d.x0 + d.x1)/2 <= Math.PI){
						return "2px";
					}else {
						return "48%"
					}				
				}
				else return (getRadius(d) * (d.x1 - d.x0) / 2)+"px";
			})
		previousStates.push(newStatus);
	}


	function arcVisible(d) {
		if(d)
			return (d.data?.visible || d.visible) ?? true;
		else return false;
	}

	function labelVisible(d) {
		if(d)
			return (d.data?.visible || d.visible) ?? true;
		else return false;
	}

	function calculateVisible(d, status){
		const type1 = d?.data?.type || d?.type;
		if(type1 == 'background' || type1 == 'shadow') return true;

		if((d?.dataTitle || d?.data?.dataTitle)) {
			if(status?.categoryStatus[type1].show)
				return true;
			else return false;
		}

		if(!status?.ringStatus[type1].show)
			return false;
		
		let startDate = d?.data?.startDate || d?.startDate;
		let endDate = d?.data?.endDate || d?.endDate;
		if(d?.value){
			endDate = moment(startDate).add(d?.value - 1, 'days').format("YYYY-MM-DD")
		}
		if(
			(moment(startDate).isSameOrAfter(moment(status?.startDate)) && moment(startDate).isSameOrBefore(moment(status?.endDate))) ||
			(moment(endDate).isSameOrAfter(moment(status?.startDate)) && moment(endDate).isSameOrBefore(moment(status?.endDate)))
		){
			return true;
		}else return false
	}
	
	///drag and drop part
	const totalValues = () =>{
		const currentState = previousStates[previousStates.length - 1];
		return moment(currentState.endDate).diff(moment(currentState.startDate), 'days') + 1;
	}
	const getAlpha = (x, y) =>{
		let alpha = -Math.atan(x/y);
			if(x/y >= 0){
				if(y <0){
					alpha = Math.PI * 2 + alpha;
				}else{
					alpha = Math.PI + alpha;
				}
			}else{
				if(y >= 0){
					alpha = Math.PI + alpha;
				}
			}
		if(alpha > 2 * Math.PI *2) alpha -= Math.PI * 2
		return alpha;
	}

	var dragHandler = d3.drag()
		.on("start", function (event, d) {
			const textPathItem = d3.select(this).select("textPath")?.node()
			if(!textPathItem){
				const index = parseInt(d3.select(this).attr("id").replace("arc-path", ""))
				const item = items[index];
				const itemForText = items[index + 1]
				const textDirection = item['text-direction'];
				item.origin = {
					x0: item.current.x0,
					x1: item.current.x1,
					startDate: item.startDate,
					endDate: item.endDate,
					alpha: getAlpha(d3.event.x, d3.event.y)
				}
				if(textDirection) 
					itemForText.origin = {
						x0: itemForText.current.x0,
						x1: itemForText.current.x1,
						startDate: itemForText.startDate,
						endDate: itemForText.endDate,
						alpha: getAlpha(d3.event.x, d3.event.y)
					}
			}else{
				const itemindex = items[parseInt(d3.select(textPathItem).attr("href").replace("#arc-path", ""))].dataIndex
				const item = items[itemindex];
				const itemForText = items[itemindex + 1]
				const textDirection = item['text-direction'];
				item.origin = {
					x0: item.current.x0,
					x1: item.current.x1,
					startDate: item.startDate,
					endDate: item.endDate,
					alpha: getAlpha(d3.event.x, d3.event.y)
				}
				if(textDirection) 
					itemForText.origin = {
						x0: itemForText.current.x0,
						x1: itemForText.current.x1,
						startDate: itemForText.startDate,
						endDate: itemForText.endDate,
						alpha: getAlpha(d3.event.x, d3.event.y)
					}
			}
		})
		.on("drag", function (event, d) {
			const textPathItem = d3.select(this).select("textPath")?.node()
			if(!textPathItem){

				const index = parseInt(d3.select(this).attr("id").replace("arc-path", ""))
				
				const item = items[index];
				const textDirection = item['text-direction'];
				const itemForText = items[index + 1]
				const alpha = getAlpha(d3.event.x, d3.event.y)
				const delta = Math.floor((alpha - item.origin.alpha) / (Math.PI * 2 / totalValues()));
				if((item.origin.x1 + delta *  (Math.PI * 2 / totalValues()) <= Math.PI * 2) && (item.origin.x1 + delta *  (Math.PI * 2 / totalValues()) >= 0)){
					item.current.x1 = item.origin.x1 + delta *  (Math.PI * 2 / totalValues());
					item.current.x0 = item.origin.x0 + delta *  (Math.PI * 2 / totalValues());
					item.startDate = moment(item.origin.startDate).add(delta,'day').format("YYYY-MM-DD");
					item.endDate = moment(item.origin.endDate).add(delta,'day').format("YYYY-MM-DD");

					if(textDirection){
						itemForText.current.x1 = itemForText.origin.x1 + delta *  (Math.PI * 2 / totalValues());
						itemForText.current.x0 = itemForText.origin.x0 + delta *  (Math.PI * 2 / totalValues());
						itemForText.startDate = moment(itemForText.origin.startDate).add(delta,'day').format("YYYY-MM-DD");
						itemForText.endDate = moment(itemForText.origin.endDate).add(delta,'day').format("YYYY-MM-DD");
						d3.select(d3.select(this).node().nextElementSibling).attr("d", arc1(itemForText.current))
					}
					d3.select(this).attr("d", arc1(item.current))
				}
			}else{
				
				const itemindex = items[parseInt(d3.select(textPathItem).attr("href").replace("#arc-path", ""))].dataIndex;
				const item = items[itemindex];
				const itemForText = items[itemindex + 1]
				const textDirection = item['text-direction'];
				const alpha = getAlpha(d3.event.x, d3.event.y)
				const delta = Math.floor((alpha - item.origin.alpha) / (Math.PI * 2 / totalValues()));

				if((item.origin.x1 + delta *  (Math.PI * 2 / totalValues()) <= Math.PI * 2) && (item.origin.x1 + delta *  (Math.PI * 2 / totalValues()) >= 0)){
					item.current.x1 = item.origin.x1 + delta *  (Math.PI * 2 / totalValues());
					item.current.x0 = item.origin.x0 + delta *  (Math.PI * 2 / totalValues());
					item.startDate = moment(item.origin.startDate).add(delta,'day').format("YYYY-MM-DD");
					item.endDate = moment(item.origin.endDate).add(delta,'day').format("YYYY-MM-DD");

					if(textDirection){
						itemForText.current.x1 = itemForText.origin.x1 + delta *  (Math.PI * 2 / totalValues());
						itemForText.current.x0 = itemForText.origin.x0 + delta *  (Math.PI * 2 / totalValues());
						itemForText.startDate = moment(itemForText.origin.startDate).add(delta,'day').format("YYYY-MM-DD");
						itemForText.endDate = moment(itemForText.origin.endDate).add(delta,'day').format("YYYY-MM-DD");
						d3.select(`#arc-path${itemindex + 1}`).attr("d", arc1(itemForText.current))
					}
					d3.select(`#arc-path${itemindex}`).attr("d", arc1(item.current))
				}

			}

			label.attr("dy", (d)=>{
				const textDirection = d['text-direction'] || d.data['text-direction']
				if(textDirection == 'inside-out') return 
				if((d.current.x0 + d.current.x1) / 2 > 90 * Math.PI/180 && (d.current.x0 + d.current.x1) / 2 < 270 * Math.PI/180){
					return 0.5 * getPad(d);
				}else return -0.5 * getPad(d)
			})

		})
		.on("end", function () {
			// const index = parseInt(d3.select(this).attr("id").replace("arc-path", ""))
		});
	dragHandler(svg.selectAll(".dataItem"));
}

if (typeof window.spiralGraph === 'undefined') {
	window.spiralGraph = window.spiralGraph = spiralGraph;
}


// END annualWheel code

return spiralGraph;

});