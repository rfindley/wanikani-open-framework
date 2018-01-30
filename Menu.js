// ==UserScript==
// @name        Wanikani Open Framework - Menu module
// @namespace   rfindley
// @description Menu module for Wanikani Open Framework
// @version     1.0.0
// @copyright   2018+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	//########################################################################
	//------------------------------
	// Published interface
	//------------------------------
	global.wkof.Menu = {
		insert_script_link: insert_script_link
	};

	//########################################################################

	//------------------------------
	// Install 'Scripts' header in menu, if not present.
	//------------------------------
	function install_scripts_header() {
		// Abort if already installed.
		if ($('.scripts-header').length !== 0) return false;

		// Install html.
		$('.nav-header:contains("Account")').before(
			'<li class="scripts-header nav-header">Scripts</li>'
		);

		// Click to open Settings menu.
		$('.dropdown.account').on('click','.scripts-submenu>a',function(e){
			var link = $(e.target).parent();
			link.siblings('.scripts-submenu.open').removeClass('open');
			link.toggleClass('open');
			// If we opened the menu, listen for off-menu clicks.
			if (link.hasClass('open')) {
				$('body').on('click.scripts-submenu',function(e){
					$('body').off('click.scripts-submenu');
					$('.scripts-submenu').removeClass('open');
					return true;
				})
			} else {
				$('body').off('click.scripts-submenu');
			}
			return false;
		});
		return true;
	}

	//------------------------------
	// Sort menu items
	//------------------------------
	function sort_name(a,b) {
		return a.querySelector('a').innerText.localeCompare(b.querySelector('a').innerText);
	}

	//------------------------------
	// Install Submenu, if not present.
	//------------------------------
	function install_scripts_submenu(name) {
		// Abort if already installed.
		if ($('.scripts-submenu[name="'+name+'"]').length !== 0) return false;

		// Install css and html.
		if ($('style[name="scripts_submenu"]').length === 0) {
			$('head').append(
				'<style name="scripts_submenu">'+
				'html#main .navbar .scripts-submenu {position:relative;}'+
				'html#main .navbar .scripts-submenu.open>.dropdown-menu {display:block;position:absolute;top:0px;}'+
				'.scripts-submenu>a:before {content:"\uf0d9 "; font-family:"FontAwesome";}'+
				'@media (max-width: 979px) {'+
				'  .scripts-submenu>a:before {content:"";}'+
				'  html#main .navbar .scripts-submenu {margin-left:1.5em;}'+
				'  html#main .navbar .scripts-submenu>a {text-align:left;}'+
				'  html#main .navbar .scripts-submenu>ul.dropdown-menu {margin-left:.5em;}'+
				'  html#main .navbar .dropdown.account>.dropdown-menu>.script-link {margin-left:1.5em;}'+
				'  html#main .navbar .dropdown.account>.dropdown-menu>.script-link>a {text-align:left;}'+
				'  html#main .navbar .dropdown-menu>li:not(.nav-header).scripts-submenu {display:block;width:100%;}'+
				'  html#main .navbar .scripts-submenu>.dropdown-menu {display:block;padding:0;margin:0;box-shadow:none;}'+
				'  html#main .navbar .scripts-submenu.open>.dropdown-menu {position:relative;top:0px;left:initial;right:initial;}'+
				'  html#main .navbar .dropdown-menu>li:not(.nav-header).scripts-submenu>.dropdown-menu>li {width:auto;padding:0 1em;}'+
				'}'+
				'</style>'
			);
		}
		$('.scripts-header').after(
			'<li class="scripts-submenu" name="'+name+'">'+
			'  <a href="#">'+name+'</a>'+
			'  <ul class="dropdown-menu">'+
			'  </ul>'+
			'</li>'
		);
		var items = $('.scripts-header').siblings('.scripts-submenu,.script-link').sort(sort_name);
		$('.scripts-header').after(items);
		return true;
	}

	//------------------------------
	// Inserts script link into script settings menu.
	//------------------------------
	function insert_script_link(config) {
		// Abort if the script already exists
		var link_id = config.name+'_settings_link'; 
		if ($('#'+link_id).length !== 0) return;
		install_scripts_header();
		if (config.submenu) {
			install_scripts_submenu(config.submenu);

			// Append the script, and sort the menu.
			var menu = $('.scripts-submenu[name="'+config.submenu+'"] .dropdown-menu');
			var class_html = (config.class ? ' class="'+config.class+'"': '');
			menu.append('<li id="'+link_id+'" name="'+config.name+'"'+class_html+'><a href="#">'+config.title+'</a></li>');
			menu.append(menu.children().sort(sort_name));
		} else {
			var class_html = (config.class ? ' '+classes:'');
			$('.scripts-header').after('<li id="'+link_id+'" name="'+config.name+'" class="script-link '+class_html+'"><a href="#">'+config.title+'</a></li>');
			var items = $('.scripts-header').siblings('.scripts-submenu,.script-link').sort(sort_name);
			$('.scripts-header').after(items);
		}

		// Add a callback for when the link is clicked.
		$('#'+link_id).on('click', function(e){
			$('body').off('click.scripts-settings');
			$('.dropdown.account').removeClass('open');
			$('.scripts-submenu').removeClass('open');
			config.on_click(e);
			return false;
		});
	}

	wkof.ready('document').then(set_ready_state);

	function set_ready_state(){
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.Menu', 'ready');},0);
	}

})(window);

