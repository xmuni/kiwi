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
			var storage_text = localStorage.getItem(lsname);

			// Update the localStorage with key/value pair
			// using the current date as key and the textbox content as value
			// Create the localStorage if necessary
			var storage_obj = JSON.parse(storage_text);
		
			var datecode = get_date_string(currentdate);
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
		var filename = `Kiwi ${currentdate.getFullYear()}-${currentdate.getMonth()+1}-${currentdate.getDate()}`;
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

function get_next_monday(date)
{
	var next_monday = new Date(date.getFullYear(), date.getMonth(), date.getDate()+(9 - date.getDay()));
	return next_monday;
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


function get_date_today()
{
	var date = new Date();

	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDate(); // "getDay()" instead returns 0 for monday, 1 for tuesday, etc

	var text = `${year}-${month}-${day}`;
	return text;
}


// Shifts a date by a certain number of days (positive or negative)
function change_date(old_date, difference)
{
    var newdate = new Date(old_date.getFullYear(),old_date.getMonth(),old_date.getDate()+difference);
    return newdate;
}


function change_currentdate(difference)
{
	// panel.Clear(); // Clear textbox
	currentdate = change_date(currentdate,difference);
	panel.LoadFromStorage(); // Load textbox content from localStorage
	update_next_prev_buttons(); // Change prev/next day button labels
	// console.log("Current date: "+currentdate);
}


// Turns a date object into a string like "20190611"
function get_date_string(date)
{
	var year = date.getFullYear();
	var month = date.getMonth()+1;
	var day = date.getDate();

	if(month<10)
		month = "0"+month;
	if(day<10)
		day = "0"+day;

	return year+month+day;
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

	var label_prev  = "< "+get_month_name(prev_date.getMonth()+1)+" "+(prev_date.getDate());
	var label_today =      get_month_name(currentdate.getMonth()+1)+" "+(currentdate.getDate());
	var label_next  =      get_month_name(next_date.getMonth()+1)+" "+(next_date.getDate())+" >";

	document.querySelector("#button-prev-day").innerText = label_prev;
	document.querySelector("#current-day").innerText = label_today;
	document.querySelector("#button-next-day").innerText = label_next;
}


// Gets the English name of a month number: 10 -> "October"
function get_month_name(month_number)
{
	var month_names = {
		1: "Jan",
		2: "Feb",
		3: "Mar",
		4: "Apr",
		5: "May",
		6: "June",
		7: "July",
		8: "Aug",
		9: "Sep",
		10: "Oct",
		11: "Nov",
		12: "Dec"
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
update_next_prev_buttons();
create_localstorage();


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
var panel = new Panel("textarea", "#labels", "#totalcal h2");

window.setTimeout(function() { panel.LoadFromStorage(); }, 100);
window.setTimeout(function() { update_panel() }, 200);
window.setTimeout(() => panel.textarea.addEventListener("keyup", update_panel), 100);


// Set up the prev/next day buttons
document.querySelector("#button-prev-day").addEventListener("click", function(){ change_currentdate(-1) });
document.querySelector("#button-next-day").addEventListener("click", function(){ change_currentdate(+1) });
