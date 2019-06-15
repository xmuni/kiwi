'use strict';


function fetch_json(url)
{
	fetch(url)
		.then(function(response) {
			return response.json();
		})
		.then(function(data) {
			// console.log(data);
			foodlist = data;
			// update_panel();
			// panel.LoadFromStorage();
			localStorage.setItem(flname,JSON.stringify(data));
		})
		.catch(error => console.error(error))
}


class Panel
{
	constructor(name_textarea, name_labeldiv, name_totaldiv)
	{
		this.textarea = document.querySelector(name_textarea);
		this.labeldiv = document.querySelector(name_labeldiv);
		this.totaldiv = document.querySelector(name_totaldiv);

		this.storage = [];
		this.total = 0;
		
		// this.LoadFromStorage();
	}

	UpdateStorage()
	{
		var lines = this.textarea.value.split('\n');
		for(var i=0; i<lines.length; i++)
		{
			if(this.storage.length < i+1)
				this.storage.push(parse_line(lines[i]));
			else if(lines[i] !== this.storage[i][0] || this.storage[i][2] === "?")
				this.storage[i] = parse_line(lines[i]);
			// else
				// console.log("Line has not changed");
		}

		// forget any extra lines in storage
		this.storage = this.storage.slice(0, lines.length);
	}

	UpdateTotal()
	{
		var temptotal = 0;
		for(var i=0; i<this.storage.length; i++)
			temptotal += this.storage[i][1];
		this.total = temptotal;
		this.totaldiv.innerText = Math.round(this.total).toString()+" Cal";
	}

	WriteLabels()
	{
		// remove all labels
		while (this.labeldiv.firstChild)
			this.labeldiv.firstChild.remove();

		// add new labels, fetching them from the storage array
		for(var i=0; i<this.storage.length; i++)
		{
			var new_div = document.createElement("div");

			// var text = "";
			// if(this.storage[i][2] == "")
			// 	text = Math.round(this.storage[i][1]);
			// else
			// 	text = this.storage[i][2];

			var text = (this.storage[i][2]=="") ? Math.round(this.storage[i][1]) : this.storage[i][2];
			
			var new_content = document.createTextNode(text);
			new_div.appendChild(new_content);
			this.labeldiv.appendChild(new_div);
		}
	}

	UpdatePanel(food_dict)
	{
		if(typeof food_dict === "undefined" && !offline)
		{
			console.log("Foodlist is undefined");
		}
		else
		{
			this.UpdateStorage();
			this.UpdateTotal();
			this.WriteLabels();
			console.log("Panel updated from foodlist");

			// Save all entries for the current day into storage
			var storage_obj = JSON.parse(localStorage.getItem(lsname));
			var datecode = get_date_string(currentdate);

			// Update the localStorage with key/value pair
			// using the current date as key and the textbox content as value
			// Create the localStorage if necessary
			if(textarea.value === "")
				delete storage_obj[datecode];
			else
				storage_obj[datecode] = textarea.value;
			localStorage.setItem(lsname, JSON.stringify(storage_obj));
		}
	}

	LoadFromStorage() // Load items to textbox and update the localStorage
	{
		var storage_text = localStorage.getItem(lsname);
		var storage_obj = JSON.parse(storage_text);
	
		var datecode = get_date_string(currentdate);
		if(datecode in storage_obj)
		{
			// console.log("Loading from storage");
			textarea.value = storage_obj[datecode];
		}
		else
		{
			// console.log("Loading nothing");
			textarea.value = "";
		}

		this.UpdateStorage();
		this.UpdateTotal();
		this.WriteLabels();
	}

	ExportTxt()
	{
		// var date = get_date_today();
		// var totalstring = Math.round(this.total).toString();

		// var text = date+" ("+totalstring+" kcal)\r\n";

		// for(var i=0; i<this.storage.length; i++)
		// {
		// 	var labelnumber = this.storage[i][1];
		// 	var labelstring = this.storage[i][2];

		// 	if(labelstring === "")
		// 		text += "\r\n"+Math.round(labelnumber).toString()+"\t"+this.storage[i][0];
		// 	else
		// 		text += "\r\n"+labelstring+"\t"+this.storage[i][0];
		// }

		// console.log(text);
		var info = day_to_string(get_date_string(currentdate));
		var filename = `Kiwi ${currentdate.getFullYear()}-${currentdate.getMonth()+1}-${currentdate.getUTCDate()}`;
		filename += ` (${Math.round(info[1])} Cal).txt`;
		download(info[0], filename, 'text/plain');
	}

	Clear()
	{
		this.storage = [];
		this.total = 0;
		this.textarea.value = "";

		var storage_obj = JSON.parse(localStorage.getItem(lsname));
		var datecode = get_date_string(currentdate);
		delete storage_obj[datecode];
		localStorage.setItem(lsname, JSON.stringify(storage_obj));

		this.WriteLabels();
		this.UpdateTotal();
		// var datecode = get_date_string(currentdate);
		// localStorage.removeItem(datecode);

		/*
		var storage_text = localStorage.getItem(lsname);
		if(storage_text != null)
		{
			var storage_obj = JSON.parse(storage_text);
			var datecode = get_date_string(currentdate);
			delete storage_obj[datecode];
			localStorage.setItem(lsname, JSON.stringify(storage_obj));
		}
		*/

		console.log("Panel cleared");
	}

	Log()
	{
		console.log(this.textarea);
	}

}



/*
	120		30g chocolate
	150		150kcal
	  _		dinner
	 34		13g cake 200kcal

	- comment entry
	- normal entry lookup
	- manual kcal insert
	- weighted manual entry
*/
// Returns an array:
// [0] = original line text
// [1] = Calories
// [2] = string as replacement for calories ("?" or "_")
function parse_line(line)
{
	// console.log(typeof food_dict);
	// if(typeof food_dict === "undefined")
	// {
	// 	console.log("Parsing with undefined dictionary");
	// 	return [line, 0, "_"];
	// }

	var label_number = 0;
	var label_string = "";
	
	var words = line.trim().split(' ');
	// console.log(words);

	// empty line, or first word without digits, or line without digits
	if(words.length < 1 || !has_digits(words[0]) || !has_digits(line))
		label_string = ("_");

	// manual calorie entry
	else if(words.length===1 && has_digits(words[0]) || words[0].endsWith("cal")) // 100kcal, 100cal, or 100c
	{
		var firstword = remove_nondigits(words[0]);
		var calories = parseFloat(firstword);

		// if the calories were negative (-300kcal)
		if(words[0].includes('-'))
			calories = -calories;

		label_number = calories;
	}

	// (at least two words are guaranteed)
	// weighted food (possibly with calories at the end)
	else
	{
		// console.log(words[0]+" -> "+amount);

		// if the calories are specified, use them instead of looking up the food name
		var lastword = words[words.length-1];
		if(has_digits(lastword)
		&&(lastword.endsWith("cal") || lastword.endsWith("c")))
		{
			var amount = parse_amount(words[0]);
			var cal100 = parseFloat(remove_nondigits(lastword));
			var calories = cal100 / 100 * amount;

			label_number = calories;
		}

		// no calories are indicated, so look up the food name
		else
		{
			var amount = parse_amount(words[0]);

			words.splice(0,1);
			var foodname = words.join(' ');
			var foodkey = get_food_match(foodname, foodlist);

			// if no matching food was found, show a "?"
			if(foodkey=="")
			{
				// console.log("No match found: "+foodname);
				label_string = "?";
			}
			else
			{
				var calories = foodlist[foodkey] / 100 * amount;
				label_number = calories;
			}
		}
	}

	var array = [line, label_number, label_string];
	return array;
}



function remove_nondigits(string)
{
	// return string.replace(/\D/g,'');
	return string.replace(/[^\d.-]/g,'');
}


function has_digits(string)
{
	return /\d/.test(string);
}


function get_food_match(foodname, dict)
{
	if(typeof dict !== "undefined")
	{
		if(dict.hasOwnProperty(foodname))
			return foodname;

		if(foodname.endsWith('s'))
		{
			var singular = foodname.slice(0,-1);
			if(dict.hasOwnProperty(singular))
				return singular;
		}

		for(var key in dict)
			if(dict.hasOwnProperty(key)
			&& key.startsWith(foodname))
				return key;
	}
	
	return "";
}


// "30g" -> 30
// "0.2kg" -> 200
function parse_amount(somestring)
{
	if(somestring.includes("kg"))
		return 1000 * parseFloat(remove_nondigits(somestring));
	else
		return parseFloat(remove_nondigits(somestring));
}


// Returns array:
// [0] = full string
// [1] = total calories for the day
function day_to_string(datecode)
{

	// var datecode = get_date_string(date);
	var storage_obj = JSON.parse(localStorage.getItem(lsname));

	if(datecode in storage_obj)
	{
		var parsed_lines = "";
		var totalcal = 0;
		var lines = storage_obj[datecode].split('\n');

		// Parse each line for the current day
		for(var i=0; i<lines.length; i++)
		{
			var info = parse_line(lines[i]);
			var text = info[0];
			var cal = info[1];
			var alt = info[2]; // alternate label
			
			var label = alt;
			if(alt === "")
			{
				label = Math.round(cal);
				totalcal += cal;
			}

			parsed_lines += `\r\n${label}\t${text}`;
		}

		var year = datecode.slice(0,4);
		var month = datecode.slice(4,6);
		var day = datecode.slice(6,8);
		var date = `${year}/${month}/${day}`;
		var totalstring = `${Math.round(totalcal)} Cal`;
		
		var text = date+"\t"+totalstring+"\r\n"+parsed_lines;
		// console.log(text);
		return [text,totalcal];
	}
	else
	{
		console.log("Date not found");
		return ["",0];
	}

	// var text = date+" ("+totalstring+" kcal)\r\n";

	// var filename = "Kiwi "+date+" ("+totalstring+" kcal).txt";
	// download(text, filename, 'text/plain');
}


function export_all()
{
	var storage_obj = JSON.parse(localStorage.getItem(lsname));

	var days = [];
	for(var key in storage_obj)
		days.push(day_to_string(key)[0]);

	var text = days.join("\r\n\r\n");
	console.log(text);
	download(text, "Kiwi.txt", 'text/plain');
}

/*
function echo_storage()
{
	var storage_obj = JSON.parse(localStorage.getItem(lsname));

	for(var key in storage_obj)
	{
		console.log(key+": "+storage_obj[key]);
	}
}
*/

/*
function get_monday(date, next)
{
	// Next Monday
	if(next)
	{
		var next_monday = new Date(date.getFullYear(), date.getMonth(), date.getUTCDate()+(9 - date.getDay()));
		return next_monday;
	}
	// The current week's Monday
	else
	{
		var next_monday = new Date(date.getFullYear(), date.getMonth(), date.getUTCDate()+(2 - date.getDay()));
		return next_monday;
	}
}
*/


function get_weekday(date)
{
	if(date.getUTCDay() === 0)
		return 6;
	else
		return date.getUTCDay() - 1;
}

function get_monday(date, next)
{
	var weekday = get_weekday(date);

	// Next Monday
	if(next)
		return change_date(date,7-weekday);

	// The current week's Monday
	else
		return change_date(date,-weekday);
}

function download(content, fileName, contentType)
{
    var newelement = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    newelement.href = URL.createObjectURL(file);
    newelement.download = fileName;
	newelement.style.display = "none";
	document.body.appendChild(newelement);
    newelement.click();
	document.body.removeChild(newelement);
	setTimeout(function() { URL.revokeObjectURL(newelement.href); }, 1000);
}

function download_txt()
{
	panel.ExportTxt();
}


function clear_textarea()
{
	if(panel.textarea.value !== ""
	&& window.confirm("Delete all entries for the current day?")) 
		panel.Clear();
}

/*
function get_date_today()
{
	var date = new Date();

	var year = date.getUTCFullYear();
	var month = date.getUTCMonth() + 1;
	var day = date.getUTCDate(); // "getDay()" instead returns 0 for monday, 1 for tuesday, etc

	var text = `${year}-${month}-${day}`;
	return text;
}
*/

// Shifts a date by a certain number of days (positive or negative)
function change_date(old_date, difference)
{
	difference = difference+1;

    var newdate = new Date(old_date.getUTCFullYear(),old_date.getUTCMonth(),old_date.getUTCDate()+difference);
    return newdate;
}


function change_currentdate(difference)
{
	// panel.Clear(); // Clear textbox
	currentdate = change_date(currentdate,difference);
	// console.log("Current date: "+currentdate);

	update_page_ui();
}


function change_date_to_datecode(datecode)
{
	currentdate = datecode_to_date(datecode);
	update_page_ui();
}


function update_page_ui()
{
	panel.LoadFromStorage(); // Load textbox content from localStorage
	update_next_prev_buttons(); // Change prev/next day button labels
	make_calendar(currentdate,7);

	// console.log("********************");
	// console.log("Current day", currentdate);
	// console.log("Next monday", get_monday(currentdate,true));
	// console.log("Past monday", get_monday(currentdate,false));
}


function datecode_to_date(datecode)
{
	var new_date = new Date();
	new_date.setFullYear(datecode.slice(0,4));
	new_date.setMonth(datecode.slice(4,6)-1);
	new_date.setUTCDate(datecode.slice(6,8));
	return new_date;
}


// Turns a date object into a string like "20190611"
function get_date_string(date)
{
	var year = date.getUTCFullYear();
	var month = date.getUTCMonth()+1;
	var day = date.getUTCDate();

	if(month<10)
		month = "0"+month;
	if(day<10)
		day = "0"+day;

	return year+month+day;
}


function make_calendar(date,days)
{
	var past_monday = get_monday(date,false);
	var calendar = document.querySelector("#calendar");

	// Clear calendar
	while (calendar.firstChild)
		calendar.firstChild.remove();

	var storage_obj = JSON.parse(localStorage.getItem(lsname));
	
	var day = past_monday;
	for(var i=0; i<days; i++)
	{
		var new_div = document.createElement("div");
		var text = day.getUTCDate();
		var new_content = document.createTextNode(text);
		new_div.appendChild(new_content);

		// Add classes
		new_div.classList.add("day");
		var datecode = get_date_string(day);
		new_div.setAttribute("data-datecode",datecode);
		if(datecode === get_date_string(currentdate))
			new_div.classList.add("current");
		else if(datecode in storage_obj)
			new_div.classList.add("datecode");

		// new_div.addEventListener("click", () => change_date_to_datecode(datecode) );

		calendar.appendChild(new_div);
		day = change_date(day,1); // Get the next day
	}

	// Make the days on the calendar trigger a date change
	set_clickable_calendar();
}


function shift_calendar(days)
{
	// Datecode on the first day of the calendar that is currently loaded
	var monday_datecode = document.querySelectorAll("#calendar .day")[0].dataset["datecode"];

	var new_monday = datecode_to_date(monday_datecode);
	new_monday = change_date(new_monday,days);

	make_calendar(new_monday,7);
}


function update_panel()
{
	panel.UpdatePanel(foodlist);
	// console.log("Values updated");
}


function load_from_storage()
{
	panel.LoadFromStorage();
}


function create_localstorage()
{
	var storage_text = localStorage.getItem(lsname);
		
	if(storage_text === null)
	{
		var storage_obj = {};
		localStorage.setItem(lsname, JSON.stringify(storage_obj));
	}
}


function update_localstorage(datecode,text)
{
	var storage_text = localStorage.getItem(lsname);
	var storage_obj = JSON.parse(storage_text);

	if(text === "")
		delete storage_obj[datecode];
	else
		storage_obj[datecode] = text;

	localStorage.setItem(lsname, JSON.stringify(storage_obj));
}


function update_next_prev_buttons()
{
	var prev_date = change_date(currentdate,-1);
	var next_date = change_date(currentdate,+1);

	var label_prev  = "< "+get_month_name(prev_date.getUTCMonth()+1)+" "+(prev_date.getUTCDate());
	var label_today =      get_month_name(currentdate.getUTCMonth()+1)+" "+(currentdate.getUTCDate());
	var label_next  =      get_month_name(next_date.getUTCMonth()+1)+" "+(next_date.getUTCDate())+" >";

	document.querySelector("#button-prev-day").innerText = label_prev;
	document.querySelector("#day-label").innerText = label_today;
	// document.querySelector("#current-day").innerText = label_today;
	document.querySelector("#button-next-day").innerText = label_next;
}


function set_clickable_calendar()
{
	document.querySelectorAll(".day").forEach(element => {
		// element.addEventListener("click", () => console.log(element.dataset["datecode"]) );
		element.addEventListener("click", () => change_date_to_datecode(element.dataset["datecode"]) );
	});
}


// Gets the English name of a month number: 10 -> "October"
function get_month_name(month_number)
{
	var month_names = {
		1: "Jan",	2: "Feb",	3: "Mar",
		4: "Apr",	5: "May",	6: "June",
		7: "July",	8: "Aug",	9: "Sep",
		10: "Oct",	11: "Nov",	12: "Dec"
	}
	if(month_number in month_names)
		return month_names[month_number];
	else
	{
		console.log("Error: "+month_number+" has no month name associated");
		return "NAME";
	}
}


/******************************************************/
/*                        Main                        */
/******************************************************/


// Default to today and create localStorage if necessary
var currentdate = new Date();
var lsname = "kiwi"; // localStorage label for storing the saved days
var flname = "foodlist"; // localStorage label for foodlist dictionary
var offline = false;
create_localstorage();

update_next_prev_buttons();
make_calendar(currentdate,7);

// Load the food dictionary
var textarea = document.querySelector("textarea");
var foodlist;
if(localStorage[flname] !== undefined)
{
	foodlist = JSON.parse(localStorage[flname]);
	// console.log("Foodlist parse from local storage");
}
if(!offline)
	fetch_json("https://xmuni.github.io/kiwi/food.json");


// Set up the panel info and load from storage
var panel = new Panel("textarea", "#labels", "#totalcal");

window.setTimeout(function() { panel.LoadFromStorage(); }, 100);
window.setTimeout(function() { update_panel() }, 200);
window.setTimeout(() => panel.textarea.addEventListener("keyup", update_panel), 100);


// Set up the prev/next day buttons
document.querySelector("#button-prev-day").addEventListener("click", function(){ change_currentdate(-1) });
document.querySelector("#button-next-day").addEventListener("click", function(){ change_currentdate(+1) });

// Set up the prev/next week buttons to update the calendar only
document.querySelector("#button-week-prev").addEventListener("click", function(){ shift_calendar(-7) });
document.querySelector("#button-week-next").addEventListener("click", function(){ shift_calendar(+7) });

