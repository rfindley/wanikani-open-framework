// ==UserScript==
// @name        Wanikani Sample Client
// @namespace   rfindley
// @description wkof_sampleclient
// @version     1.00
// @include     https://www.wanikani.com/
// @include     https://www.wanikani.com/dashboard
// @copyright   2018+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-end
// @grant       none
// ==/UserScript==

window.sample_client = {};

(function(global) {
	'use strict';

	//-----------------------------------
	// Include the desired WK Open Framework modules, and set
	// up some functions to be called when each module is ready.
	//-----------------------------------
	// Modules that our script uses.
	var modules = 'Menu, Settings';

	wkof.include(modules);
	wkof.ready(modules).then(startup);

	//-----------------------------------
	// Script-global variables
	//-----------------------------------
	var settings_dialog;

	//-----------------------------------
	// Called upon startup
	//-----------------------------------
	function startup() {
		wkof.Settings.load('settings_demo')
		.then(setup);
	}

	//-----------------------------------
	// Set up menu link and dialog.
	//-----------------------------------
	function setup() {
		// Set up menu item to open script.
		wkof.Menu.insert_script_link({name:'settings_demo',submenu:'Demo',title:'Settings Demo',on_click:dialog_open});

		// Set up settings dialog.
		settings_dialog = new wkof.Settings({
			script_id: 'settings_demo',
			title: 'Settings Demo',
			pre_open: dialog_preopen,
			on_save: dialog_save,
			on_cancel: dialog_cancel,
			on_close: dialog_close,
			settings: {
				'grp_presets': {type:'group',label:'Presets',content:{
					'presets': {type:'list',refresh_on_change:true,content:{}},
				}},
				'grp_group': {type:'group',label:'Group',content:{
					'section': {type:'section',label:'Section'},
					'dropdown': {type:'dropdown',label:'Dropdown',on_change:log_change,content:{'val1':'Value 1','val2':'Value 2'}},
					'list': {type:'list',label:'List',size:4,on_change:log_change,content:{'val1':'Value 1','val2':'Value 2','val3':'Value 3'}},
					'multi': {type:'list',label:'Multi',multi:true,size:3,on_change:log_change,content:{'val1':'Value 1','val2':'Value 2','val3':'Value 3','val4':'Value 4','val5':'Value 5','val6':'Value 6'}},
					'divider': {type:'divider'},
					'text': {type:'text',label:'Text',on_change:log_change,default:'hi',match:/^\d{3}-\d{3}-\d{4}$/,error_msg:'Must be xxx-xxx-xxxx'},
					'number': {type:'number',label:'Number',on_change:log_change,default:1,min:1,max:14},
					'password': {type:'input',subtype:'password',label:'Password',on_change:log_change,validate:check_password},
					'checkbox': {type:'checkbox',label:'Checkbox',on_change:log_change},
					'color': {type:'color',label:'Color',no_save:true,default:'#ff2222',on_change:log_change},
				}},
			}
		});
		settings_dialog.load();
	}

	//-----------------------------------
	// Called just before the dialog box is opened.
	//-----------------------------------
	function dialog_preopen() {
	}

	//-----------------------------------
	// Open the settings dialog box.
	//-----------------------------------
	function dialog_open() {
		settings_dialog.open();
	}

	//-----------------------------------
	// Log a changed setting to the console.
	//-----------------------------------
	function log_change(name, value, config) {
		if (typeof value === 'object') value = JSON.stringify(value);
		console.log(name+'='+value);
	}

	//-----------------------------------
	// Validate the password field.
	//-----------------------------------
	function check_password(value) {
		if (value.length < 8) return 'Must be 8 or more characters';
	}

	//-----------------------------------
	// Called when the user clicks the Save button.
	//-----------------------------------
	function dialog_save(values) {
		console.log('Saving...');
	}

	//-----------------------------------
	// Called when the user clicks the Cancel button.
	//-----------------------------------
	function dialog_cancel(values) {
		console.log('Canceling...');
	}

	//-----------------------------------
	// Called when the settings dialog closes.
	//-----------------------------------
	function dialog_close(values) {
		// Log the current settings to the console.
		for (var name in values) {
			var value = values[name];
			if (typeof value === 'object') value = JSON.stringify(value);
			console.log(name+'='+value);
		}
	}

})(window.sample_client);

