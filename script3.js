'use strict';


function fetch_json(url)
{
	fetch(url)
		.then(function(response) {
			return response.json();
		})
		.then(function(data) {
			console.log(data);
			foodlist = data;
			update_panel();
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
	}

	UpdateStorage()
	{
		var lines = this.textarea.value.split('\n');
		for(var i=0; i<lines.length; i++)
		{
			if(this.storage.length < i+1)
				this.storage.push(parse_line(lines[i]));
			else if(lines[i] !== this.storage[i][0])
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
		this.totaldiv.innerText = Math.round(this.total).toString()+" kcal";
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

			var text = "";
			if(this.storage[i][2] == "")
				text = Math.round(this.storage[i][1]);
			else
				text = this.storage[i][2];
			
			var new_content = document.createTextNode(text);
			new_div.appendChild(new_content);
			this.labeldiv.appendChild(new_div);
		}
	}

	UpdatePanel(food_dict)
	{
		if(typeof food_dict === "undefined")
		{
			console.log("Foodlist is undefined");
		}
		else
		{
			this.UpdateStorage();
			this.UpdateTotal();
			this.WriteLabels();

			console.log("Panel updated from foodlist");
			localStorage.setItem('textbox', JSON.stringify(textarea.value));
		}
		
	}

	ExportTxt()
	{
		var date = get_date_today();
		var totalstring = Math.round(this.total).toString();

		var text = date+" ("+totalstring+" kcal)\r\n";

		for(var i=0; i<this.storage.length; i++)
		{
			var labelnumber = this.storage[i][1];
			var labelstring = this.storage[i][2];

			if(labelstring === "")
				text += "\r\n"+Math.round(labelnumber).toString()+"\t"+this.storage[i][0];
			else
				text += "\r\n"+labelstring+"\t"+this.storage[i][0];
		}

		console.log(text);
		var filename = "Kiwi "+date+" ("+totalstring+" kcal).txt";
		download(text, filename, 'text/plain');
	}

	Clear()
	{
		this.storage = [];
		this.total = 0;
		this.textarea.value = "";

		this.WriteLabels();
		this.UpdateTotal();
		localStorage.removeItem('textbox');

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
function parse_line(line)
{
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
	&& window.confirm("Delete all entries?")) 
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


function update_panel()
{
	panel.UpdatePanel(foodlist);
	// console.log("Values updated");

	// save all textarea items to local storage
	// localStorage.setItem('textbox', JSON.stringify(textarea.value));
}


/******************************************************/
/*                        Main                        */
/******************************************************/


var textarea = document.querySelector("textarea");
var foodlist;
fetch_json("https://engivirus.github.io/kiwi/food.json");


// load most recent items into textbox
var savedtext = localStorage.getItem('textbox');
if(savedtext !== null)
	textarea.value = JSON.parse(savedtext);


var panel = new Panel("textarea", "#labels", "#totalcal h2");
// textarea.oninput = update_panel();
textarea.addEventListener("keyup", update_panel);
// textarea.addEventListener("change", update_panel);
window.setTimeout(update_panel, 100);
