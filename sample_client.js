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
	var modules = 'Apiv2, ItemData, Menu, Settings';

	wkof.include(modules);
	wkof.ready('ItemData').then(fetch_items);
	wkof.ready('Menu').then(install_menu);
	wkof.ready('Settings').then(install_settings);
	wkof.ready(modules).then(startup);

	//-----------------------------------
	// Local variables
	//-----------------------------------
	var settings_dialog;

	function fetch_items() {
		var timer_a = new Date().getTime();
		wkof.ItemData.get_items({
			wk_items: {
				options: { // See ItemData documentation for valid options
					assignments: true, // Adds assignments endpoint as item.assignments
					review_statistics: true, // Adds review_statistics endpoint as item.review_statistics
					study_materials: true,
				},
				filters: { // See ItemData documentation for valid filters
					item_type: {value: ['voc']},
					level: {value: '1-3,5'}, // Levels 1 through 3, and 5
//					level: {value: '-2 - +0'}, // User's current and previous two levels
//					level: {value: '*, !+0'}, // All levels, except current level
//					level: {value: '1 - -1'}, // Levels 1 to [current - 1]
//					level: {value: '+1'}, // Next level only
//					srs: {value: ['appr1','appr2','appr3','appr4']}, // All apprentice items
//					srs: {value: ['burn'], invert:true}, // All items except burned
//					have_burned: {value: true}, // All items that were burned once (including resurrected)
				},
			},
//			core10k: {}, // If someone wants to create this... ^_^
		})
		.then(process_items.bind(null,'timer_a',timer_a));
	}

	function process_items(name, starttime, items) {
		var endtime = new Date().getTime();
		console.log(name+': Found '+items.length+' items (took '+(endtime-starttime)+'ms)');

		// Make the results available from the console as 'items'.
		window.items = items;

		// Demonstrate the contents of returned items:
		if (items.length === 0) return; // Can't show anything if no items returned.
		var item = items[0];
		var str = item.object+': '; // subjects.object ('vocabulary')
		str += item.data.slug;        // subjects.data.slug ('アメリカ人')
		if (item.data.meanings) {
			var meanings = item.data.meanings.map(entry => entry.meaning).join(', ');
			str += '\n   meaning: '+meanings;
		}
		if (item.assignments) {
			str += '\n       srs: '+item.assignments.srs_stage_name; // assignments.data.srs_stage_name
		}
		if (item.review_statistics) {
			var mc = item.review_statistics.meaning_correct;
			var mi = item.review_statistics.meaning_incorrect;
			var rc = item.review_statistics.reading_correct;
			var ri = item.review_statistics.reading_incorrect;
			str += '\n  accuracy: Meaning = '+mc+'/'+(mc+mi)+', Reading = '+rc+'/'+(rc+ri);
		}
		if (item.study_materials) {
			if (item.study_materials.meaning_synonyms !== null) {
				var synonyms = item.study_materials.meaning_synonyms.join(', ');
				str += '\n  synonyms: '+synonyms;
			}
		}
		console.log(str);
	}

	//-----------------------------------
	// Install some sample links in the Wanikani menu.
	// 'Menu->Settings->Ultimate Timeline' will open a sample settings menu.
	//-----------------------------------
	function install_menu() {
		function do_nothing(){}

		// The settings box configuration
		wkof.Menu.insert_script_link({
			script_id: 'timeln',
			submenu:   'Settings',
			title:     'Ultimate Timeline',
			on_click:  open_settings
		});

		// Insert some sample scripts.
		wkof.Menu.insert_script_link({name:'appstore',title:'App Store',on_click:do_nothing});
		wkof.Menu.insert_script_link({name:'burnmgr',submenu:'Open',title:'Burn Manager',class:'wkof',on_click:do_nothing});
		wkof.Menu.insert_script_link({name:'dpp',submenu:'Settings',title:'Dashboard Progress Plus',class:'wkof',on_click:do_nothing});
		wkof.Menu.insert_script_link({name:'sample_client',submenu:'Settings',title:'Sample Client',on_click:do_nothing});
	}

	//-----------------------------------
	// This function is called by clicking 'Menu->Settings->Ultimate Timeline'.
	// It opens a sample Settings dialog for the Ultimate Timeline script.
	//-----------------------------------
	function open_settings() {
		settings_dialog.open();
	}

	//-----------------------------------
	// Our initialization at the top of this script calls this function
	// when the Settings module is loaded.  This function sets up a settings
	// dialog that can be opened by clicking 'Menu->Settings->Ultimate Timeline'.
	//-----------------------------------
	function install_settings() {
		settings_dialog = new wkof.Settings({
			script_id: 'timeln',
			title: 'Ultimate Timeline',
			on_save: process_settings,
			settings: {
				'pg_graph': {type:'page',label:'Graph',content:{
					'grp_General': {type:'group',label:'General',content:{
						'location': {type:'dropdown',label:'Graph Location',content:{'bnr':'Before Next-Review','anr':'After Next-Review','asrs':'After SRS-Progress','alvl':'After Level-Progress','aunl':'After New-Unlocks','aforum':'After Recent-Topics'}},
						'graph_height':{type:'number',label:'Graph Height (in pixels)',default:100,min:60},
					}},
					'grp_time': {type:'group',label:'Time Axis',content:{
						'absrel': {type:'dropdown',label:'Absolute/Relative Time',content:{'abs':'Absolute (time of day)','rel':'Relative (hrs from now)'}},
						'hours24': {type:'dropdown',label:'12/24-Hour Format',content:{'12':'12-hour','24':'24-hour'}},
						'max_days': {type:'number',label:'Slider Max Range (in days)',default:7,min:1,max:14},
						'allow_range': {type:'checkbox',label:'Allow Time-Range Selection',default:true},
					}},
					'grp_bars': {type:'group',label:'Bars',content:{
						'bar_style': {type:'dropdown',label:'Bar Contents',content:{'rkv':'Rad+Kan+Voc','srs':'SRS Levels','sum':'Summary Only'},default:'rkv'},
						'special_bars': {type:'dropdown',label:'Special Bars',content:{'none':'None','curr':'Current Level','burn':'Burn Items','bothcurr':'Both (priority=Current)','bothburn':'Both (priority=Burn)'},default:'bothcurr'},
					}},
					'grp_markers': {type:'group',label:'Markers',content:{
						'mark_curr': {type:'dropdown',label:'<i>Current Level</i> Markers',content:{'none':'None','rk':'Rad+Kan','rkv':'Rad+Kan+Voc'},default:'rkv'},
						'mark_burn': {type:'checkbox',label:'Show <i>Burn</i> Markers',default:true},
					}},
				}},
				'pg_detail': {type:'page',label:'Detail View',content:{
					'grp_detail': {type:'group',label:'Review Details',content:{
						'show_detail': {type:'checkbox',label:'Show Review Details',default:true}
					}}
				}},
				'pg_color': {type:'page',label:'Colors',content:{
					'grp_detail': {type:'group',label:'Colors',content:{
						'clr_curr': {type:'color',label:'Current Level Bar/Arrow',default:'#ffffff'},
						'clr_burn': {type:'color',label:'Burned Items Bar/Arrow',default:'#000000'},
						'clr_new_day': {type:'color',label:'New Day Grid Mark/Label',default:'#ff2222'}
					}}
				}}
			}
		});
	}

	//-----------------------------------
	// Process any changes from the Settings dialog when user clicks 'Save'.
	//-----------------------------------
	function process_settings(){
		//TODO: redraw timeline
		console.log('Settings saved!');
	}

	//-----------------------------------
	// Our setup at the top of this script calls this function
	// when all requested framework modules are ready to be accessed.
	//-----------------------------------
	function startup() {
		// TODO: Your main script logic goes here
	}

})(window.sample_client);

