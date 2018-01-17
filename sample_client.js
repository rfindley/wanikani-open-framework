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
	var modules = 'Apiv2, Menu, Settings';

	wkof.include(modules);
	wkof.ready('Menu').then(install_menu);
	wkof.ready('Settings').then(install_settings);
	wkof.ready(modules).then(startup);

	//-----------------------------------
	// Local variables
	//-----------------------------------
	var settings_dialog;

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

