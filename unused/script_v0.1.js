
function fetch_json(url)
{
	fetch(url)
		.then(function(response) {
			return response.json();
		})
		.then(function(data) {
			console.log(data);
			foodlist = data;
		})
		.catch(error => console.error(error))
}


// returns an array of tuples [name,grams]
function get_text_entries(item)
{
	var entries = [];

	var lines = item.value.split('\n');
	// console.log(lines);
	for(var i=0; i<lines.length; i++)
	{
		var pair = split_amount_and_foodname(lines[i]);

		if(pair[0] !="" && pair[1] != "")
		{
			var amount = parse_amount(pair[0]);
			var name = pair[1];
			var new_pair = [name, amount];
			entries.push(new_pair);
		}
		else
		{
			var new_pair = ["", 0];
			entries.push(new_pair);
		}
	}

	// console.log(lines);
	return entries;
}


function create_label_array(entries)
{
	var calories_array = [];
	
	for(var i=0; i<entries.length; i++)
	{
		var foodname = entries[i][0];
		// console.log(foodname);
		if(foodname == "")
		{
			calories_array.push(-1); // empty line
		}
		else if(get_food_match(foodname, foodlist) != "") // best key match in dictionary
		{
			var amount = foodlist[get_food_match(foodname, foodlist)] / 100 * entries[i][1];
			calories_array.push(Math.round(amount));
		}
		else
		{
			calories_array.push(-2); // food not in database
		}
	}

	// console.log(calories_array);
	return calories_array;
}


function set_labels(array)
{
	var labels_div = document.querySelector("#labels");

	// remove all labels
	while (labels_div.firstChild)
	{
	    labels_div.firstChild.remove();
	}

	var html_content = "";
	for(var i=0; i<array.length; i++)
	{
		// console.log(array[i]);
		
		var new_div = document.createElement("div");

		var text = array[i].toString();
		if(array[i] === -1)
			text = "_";
		else if(array[i] === -2)
			text = "?";
		
		new_content = document.createTextNode(text);

		new_div.appendChild(new_content);
		
		// console.log(new_div);

		labels_div.appendChild(new_div);
	}
}


function update_labels()
{
	var entries = get_text_entries(textarea);
	var array = create_label_array(entries);
	set_labels(array);
}

/*
function update_labels_singlestep()
{
	// read lines
	// look up value and add to array<string>
	// make label divs
	// set total

	total = 0

	for line in lines:
		if ' ' in line:
			amount, foodname = parse_line(line)
			cal100 = dict[foodname]
			calories = amount/100*cal100
			total += calories
			array.append(str(calories))

	for string in array:
		make_new_div(string)

	total.innerHtml = total
}
*/

function update_total()
{
	var labels = document.querySelector("#labels").children;
	var total = 0;

	for(var i=0; i<labels.length; i++)
	{
		// console.log(labels[i]);
		if(labels[i].innerText != "_" && labels[i].innerText != "?")
			total += parseFloat(labels[i].innerText);
	}

	var totalcal_div = document.querySelector("#totalcal h2");
	totalcal_div.innerText = total+" kcal";
}

function get_food_match(foodname, dict)
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
		if(dict.hasOwnProperty(key))
			if(key.startsWith(foodname))
				return key;
	
	return "";
}

// split "30g mixed nuts" into ["30g","mixed nuts"]
function split_amount_and_foodname(line)
{
	line = line.trim();
	var amount = "";

	for(var i=0; i<line.length; i++)
	{
		if(line[i]==' ' && amount=="")
		{
			amount = line.slice(0,i); // from start of line to here
		}
		else if(amount != "")
		{
			var foodname = line.slice(i,line.length); // from here to the end of line
			return [amount, foodname];
		}
	}

	return ["",""];
}

function parse_amount(somestring)
{
	if(somestring.includes("kg"))
		return 1000 * parseFloat(somestring.replace("kg",""));
	else
		return parseInt(somestring.replace("g",""));
}

function update()
{
	update_labels();
	update_total();
	// window.clearInterval(timer);
	console.log("Values updated");

	// save all textarea items to local storage
	localStorage.setItem('textbox', JSON.stringify(textarea.value));
}

function set_update_timeout()
{
	if(updating == false)
	{
		updating = true;
		timer = window.setInterval(update, 300);
	}

	// after 1 second of no keypresses, disable the updating interval
	window.clearTimeout(timer_sleep);
	timer_sleep = window.setTimeout(function() { window.clearTimeout(timer); updating=false; }, 1000);
}


/******************************************************/
/*                        Main                        */
/******************************************************/


var textarea = document.querySelector("textarea");
var updating = false;
var timer = 0;
var timer_sleep = 0;
var foodlist;
fetch_json("https://engivirus.github.io/kiwi/food.json");


// load most recent items into textbox
var savedtext = localStorage.getItem('textbox');
if(savedtext !== null)
	textarea.value = JSON.parse(savedtext);


// stop updating the items after 1 second of not typing
textarea.addEventListener("keyup", set_update_timeout);
set_update_timeout();


