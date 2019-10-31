// ==UserScript==
// @name        Wanikani Open Framework - Menu module
// @namespace   rfindley
// @description Menu module for Wanikani Open Framework
// @version     1.0.9
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

	function escape_attr(attr) {return attr.replace(/"/g,'\'');}
	function escape_text(text) {return text.replace(/[<&>]/g, function(ch) {var map={'<':'&lt','&':'&amp;','>':'&gt;'}; return map[ch];});}

	//------------------------------
	// Install 'Scripts' header in menu, if not present.
	//------------------------------
	function install_scripts_header() {
		// Abort if already installed.
		if ($('.scripts-header').length !== 0) return false;
		var top_menu;

		// Install html.
		switch (location.pathname) {
			case '/review/session':
				// Install css and html.
				if ($('style[name="scripts_submenu"]').length === 0) {
					$('head').append(
						'<style name="scripts_submenu">'+
						'#scripts-menu.scripts-menu-icon {display:inline-block}'+
						'#scripts-menu .scripts-icon {display:inline-block}'+
						'#scripts-menu:not(.open) > .dropdown-menu {display:none;}'+
						'#scripts-menu .scripts-submenu:not(.open) > .dropdown-menu {display:none;}'+
						'#scripts-menu .dropdown-menu {position:absolute; background-color:#eee; margin:0; padding:5px 0; list-style-type:none; border:1px solid #333;}'+
						'#scripts-menu .dropdown-menu > li {text-align:left; color:#333; white-space:nowrap; line-height:20px; padding:3px 0;}'+
						'#scripts-menu .dropdown-menu > li.scripts-header {text-transform:uppercase; font-size:11px; font-weight:bold; padding:3px 20px;}'+
						'#scripts-menu .dropdown-menu > li:hover:not(.scripts-header) {background-color:rgba(0,0,0,0.15)}'+
						'#scripts-menu .dropdown-menu a {padding:3px 20px; color:#333; opacity:1;}'+
						'#scripts-menu .scripts-submenu {position:relative;}'+
						'#scripts-menu .scripts-submenu > a:after {content:"\uf0da"; font-family:"FontAwesome"; position:absolute; top:0; right:0; padding:3px 4px 3px 0;}'+
						'#scripts-menu .scripts-submenu .dropdown-menu {left:100%; top:-6px;}'+
						'</style>'
					);
				}
				$('#summary-button a[href="/review"]').after(
					'<div id="scripts-menu" class="scripts-menu-icon">'+
					'  <a class="scripts-icon" href="#"><i class="icon-gear" title="Script Menu"></i></a>'+
					'  <ul class="dropdown-menu">'+
					'    <li class="scripts-header">Script Menu</li>'+
					'  </ul>'+
					'</div>'
				);
				top_menu = $('#scripts-menu');
				$('#scripts-menu > a.scripts-icon').on('click', function(e){
					top_menu.toggleClass('open');
					if (top_menu.hasClass('open')) {
						$('body').on('click.scripts-menu', function(){
							top_menu.removeClass('open');
							$('body').off('.scripts-menu');
						});
					}
					return false;
				});
				break;

			default:
				// Install css and html.
				top_menu = $('[class$="account"]');
				if ($('style[name="scripts_submenu"]').length === 0) {
					$('head').append(
						'<style name="scripts_submenu">'+
						'.sitemap__section.scripts-noposition {position:initial;}'+
						'.scripts-submenu.open>.dropdown-menu {display:block;position:absolute;top:0px;margin-top:0;left:-8px;transform:scale(1) translateX(-100%);min-width:200px}'+
						'.scripts-submenu .dropdown-menu:before {left:100%;top:12px;z-index:-1;}'+
						'.scripts-submenu .dropdown-menu .sitemap__pages {padding:5px 15px 0px 15px;}'+
						'.scripts-submenu .dropdown-menu .sitemap__page:last-child {margin-bottom:0;}'+
						'.scripts-submenu>a:before {content:"\uf0d9 "; font-family:"FontAwesome";}'+
						'@media (max-width: 979px) {'+
						'  .scripts-submenu>a:before {content:"";}'+
						'  .scripts-submenu>.dropdown-menu {display:contents;position:initial;top:initial;margin-top:initial;left:initial;transform:none;min-width:initial}'+
						'}'+
						'</style>'
					);
				}
				$('.user-summary').after(
					'<li class="sitemap__section sitemap__section--subsection scripts-noposition">'+
					'  <h3 class="sitemap__section-header sitemap__section-header--subsection">Scripts</h3>'+
					'  <ul class="sitemap__pages scripts-header"></ul>'+
					'</li>'
				);
				break;
		}

		// Click to open sub-menu.
		top_menu.on('click','.scripts-submenu>a',function(e){
			var link = $(e.target).parent();
			link.siblings('.scripts-submenu.open').removeClass('open');
			if (location.pathname !== '/review/session') {
				link.find('.dropdown-menu').css('top',link.position().top+'px');
			}
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
		var safe_name = escape_attr(name);
		var safe_text = escape_text(name);
		var submenu = $('.scripts-submenu[name="'+safe_name+'"]');
		if (submenu.length > 0) return submenu;

		if (location.pathname === '/review/session') {
			submenu = $(
				'<li class="scripts-submenu" name="'+safe_name+'">'+
				'  <a href="#">'+safe_text+'</a>'+
				'  <ul class="dropdown-menu">'+
				'  </ul>'+
				'</li>'
			);
			$('.scripts-header').after(submenu);
		} else {
			submenu = $(
				'<li class="sitemap__page scripts-submenu" name="'+safe_name+'">'+
				'  <a href="#">'+safe_text+'</a>'+
				'  <div class="sitemap__expandable-chunk dropdown-menu" data-expanded="true" aria-expanded="true">'+
				'    <ul class="sitemap__pages">'+
				'    </ul>'+
				'  </div>'+
				'</li>'
			);
			$('.scripts-header').append(submenu);
		}
		var items = $('.scripts-header').siblings('.scripts-submenu,.script-link').sort(sort_name);
		$('.scripts-header').after(items);
		return submenu;
	}

	//------------------------------
	// Inserts script link into Wanikani menu.
	//------------------------------
	function insert_script_link(config) {
		// Abort if the script already exists
		var link_id = config.name+'_script_link'; 
		var link_text = escape_text(config.title);
		if ($('#'+link_id).length !== 0) return;
		install_scripts_header();
		var menu, classes, items, link_html;
		if (config.submenu) {
			var submenu = install_scripts_submenu(config.submenu);

			// Append the script, and sort the menu.
			if (location.pathname === '/review/session') {
				menu = submenu.find('.dropdown-menu');
			} else {
				menu = submenu.find('.dropdown-menu>ul');
			}
			classes = ['sitemap__page'];
			if (config.class) classes.push(config.class_html);
			link_html = '<li id="'+link_id+'" name="'+config.name+'" class="'+classes.join(' ')+'"><a href="#">'+link_text+'</a></li>';
			menu.append(link_html);
			menu.append(menu.children().sort(sort_name));
		} else {
			classes = ['sitemap__page', 'script-link'];
			if (config.class) classes.push(config.class_html);
			link_html = '<li id="'+link_id+'" name="'+config.name+'" class="'+classes.join(' ')+'"><a href="#">'+link_text+'</a></li>';
			if (location.pathname === '/review/session') {
				$('.scripts-header').after(link_html);
				items = $('.scripts-header').siblings('.scripts-submenu,.script-link').sort(sort_name);
				$('.scripts-header').after(items);
			} else {
				$('.scripts-header').append(link_html);
				items = $('.scripts-header').siblings('.scripts-submenu,.script-link').sort(sort_name);
				$('.scripts-header').append(items);
			}
		}

		// Add a callback for when the link is clicked.
		$('#'+link_id).on('click', function(e){
			$('body').off('click.scripts-link');
			$('#scripts-menu').removeClass('open');
			$('.scripts-submenu').removeClass('open');
			$('[class$="account"]').siblings('[data-navigation-section-toggle]').click();
			var nav_toggle = $('.navigation__toggle');
			if (nav_toggle.is(':visible')) nav_toggle.click();
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
