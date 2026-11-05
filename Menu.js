// ==UserScript==
// @name        Wanikani Open Framework - Menu module
// @namespace   rfindley
// @description Menu module for Wanikani Open Framework
// @version     1.0.26
// @copyright   2018-2024, Robin Findley
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
	function escape_text(text) {return text.replace(/[<&>]/g, function(ch) {let map={'<':'&lt','&':'&amp;','>':'&gt;'}; return map[ch];});}

	let top_menu, scripts_menu;

	//------------------------------
	// Handler that closes menus when clicking outside of menu.
	//------------------------------
	function body_click(e) {
		top_menu.classList.remove('open');
		for (let submenu of document.querySelectorAll('.scripts-submenu.open')) {
			submenu.classList.remove('open');
		}
		document.body.removeEventListener('click', body_click);
	}

	//------------------------------
	// Return an <svg> element to hold icon <symbol>s.
	// Uses WaniKani's inline icon sprite when present; otherwise creates
	// a hidden sprite of our own, so a WaniKani markup change can't crash us.
	//------------------------------
	function get_icon_sprite() {
		let svg = document.querySelector('svg symbol[id^="wk-icon"]')?.closest('svg');
		if (svg) return svg;
		svg = document.getElementById('wkof-icon-sprite');
		if (!svg) {
			document.body.insertAdjacentHTML('afterbegin',
				'<svg id="wkof-icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"></svg>');
			svg = document.getElementById('wkof-icon-sprite');
		}
		return svg;
	}

	function insert_gear_icon() {
		if (!document.getElementById('wk-icon__gear')) {
			get_icon_sprite().insertAdjacentHTML('beforeend','<symbol id="wk-icon__gear" viewBox="0 0 500 500"><path d="M405,310L492,310L492,195L405,190L379,146L423,71L319,8L275,85L225,85L181,8L77,71L121,146L95,190L8,190L8,310L95,310L121,354L77,429L181,492L225,415L275,415L319,492L423,429L379,354L405,310L325,281L281,325L219,325L176,281L176,219L219,176L281,176L325,219L325,281Z"></path></symbol>');
		}
	}

	//------------------------------
	// Install 'Scripts' header in menu, if not present.
	//------------------------------
	function install_scripts_header() {
		// Abort if already installed.
		if (document.querySelector('.scripts-header')) return false;
		let summary_button, scripts_icon;

		// Install css.
		if (!document.querySelector('style[name="scripts_submenu"]')) {
			document.head.insertAdjacentHTML('beforeend',
				`<style name="scripts_submenu">
				.character-header {z-index:100;}
				.character-header__menu-navigation a {text-decoration:none;}
				.character-header__menu-navigation-link {margin-right: 8px;}
				#scripts-menu.menu-type-quiz {text-shadow:none;}
				#scripts-menu.menu-type-quiz:not(.open) > .dropdown-menu {display:none;}
				#scripts-menu.menu-type-quiz .scripts-submenu:not(.open) > .dropdown-menu {display:none;}
				#scripts-menu.menu-type-quiz ul.dropdown-menu {position:absolute; background-color:#eee; margin:0; padding:5px 0; list-style-type:none; border:1px solid #333; display:block;}

				#scripts-menu.menu-type-quiz ul.dropdown-menu > li {text-align:left; color:#333; white-space:nowrap; line-height:20px; padding:3px 0; display:list-item; margin:0;}
				#scripts-menu.menu-type-quiz ul.dropdown-menu > li.scripts-header {text-transform:uppercase; font-size:11px; font-weight:bold; padding:3px 20px; display:list-item;}
				#scripts-menu.menu-type-quiz ul.dropdown-menu > li:hover:not(.scripts-header) {background-color:rgba(0,0,0,0.15)}

				#scripts-menu.menu-type-quiz ul.dropdown-menu a {padding:3px 20px; color:#333; opacity:1; margin:0; border:0; display:inline;}

				#scripts-menu.menu-type-quiz .scripts-submenu {position:relative;}
				#scripts-menu.menu-type-quiz .scripts-submenu > a:after {content:">"; position:absolute; top:0; right:0; padding:3px 4px 3px 0;}
				#scripts-menu.menu-type-quiz .scripts-submenu .dropdown-menu {left:100%; top:-7px;}

				#scripts-menu.menu-type-site.sitemap__section.scripts-noposition {position:initial;}
				#scripts-menu.menu-type-site .scripts-submenu>.dropdown-menu {display:none;}
				#scripts-menu.menu-type-site .scripts-submenu.open>.dropdown-menu {display:block;position:absolute;top:0px;margin-top:0;left:-8px;transform:scale(1) translateX(-100%);min-width:200px}
				#scripts-menu.menu-type-site .scripts-submenu .dropdown-menu:before {left:100%;top:12px;z-index:-1;}
				#scripts-menu.menu-type-site .scripts-submenu .dropdown-menu .sitemap__pages {padding:5px 15px 0px 15px;}
				#scripts-menu.menu-type-site .scripts-submenu .dropdown-menu .sitemap__page:last-child {margin-bottom:0;}
				#scripts-menu.menu-type-site .scripts-submenu>a:before {content:"< ";}
				@media (max-width: 979px) {
				  #scripts-menu.menu-type-site .scripts-submenu>a:before {content:"";}
				  #scripts-menu.menu-type-site .scripts-submenu>.dropdown-menu {display:contents;position:initial;top:initial;margin-top:initial;left:initial;transform:none;min-width:initial}
				}
				</style>`
			);
		}

		// Install html.
		if (location.pathname.match(/^\/subjects\/(review|lesson|[^\/]+\/lesson|extra_study)/) !== null ||
			 location.pathname.match(/^\/subject-lessons\//) !== null ||
			 location.pathname.match(/^\/recent-mistakes\/[^\/]+\/quiz/) !== null) {
			summary_button = document.querySelector('.summary-button');
			if (!summary_button) return false;

			insert_gear_icon();
			summary_button.parentElement.insertAdjacentHTML('afterend',
				`<div id="scripts-menu" class="menu-type-quiz scripts-menu-icon character-header__menu-navigation-link">
					<a class="scripts-icon summary-button" href="#">
				     <svg class="wk-icon wk-icon--gear" viewBox="0 0 500 500" aria-hidden="true">
				       <use href="#wk-icon__gear"></use>
				     </svg>
				   </a>
					<ul class="dropdown-menu">
						<li class="scripts-header">Script Menu</li>
					</ul>
				</div>`
			);

			top_menu = document.querySelector('#scripts-menu');
			scripts_icon = document.querySelector('#scripts-menu > a.scripts-icon');

			function scripts_icon_click(e) {
				e.preventDefault();
				e.stopPropagation();
				top_menu.classList.toggle('open');
				if (top_menu.classList.contains('open')) document.body.addEventListener('click', body_click);
			}

			scripts_icon.addEventListener('click', scripts_icon_click);

		} else {
			// Install html.
			top_menu = document.querySelector('button[class$="account"]');
			if (!top_menu) return;

			document.querySelector('.user-summary').insertAdjacentHTML('afterend',
				`<li id="scripts-menu" class="menu-type-site sitemap__section sitemap__section--subsection scripts-noposition">
				  <h3 class="sitemap__section-header--subsection">Scripts</h3>
				  <ul class="sitemap__pages scripts-header"></ul>
				</li>`
			);
		}

		// Click to open/close sub-menu.
		scripts_menu = document.querySelector('#scripts-menu');
		scripts_menu.addEventListener('click', submenu_click);

		function submenu_click(e){
			e.preventDefault();
			e.stopPropagation();
			if (!e.target.matches('.scripts-submenu>a')) return false;
			let link = e.target.parentElement;
			for (let submenu of link.parentElement.querySelectorAll('.scripts-submenu.open')) {
				if (submenu !== link) submenu.classList.remove('open');
			};
			if (location.pathname.match(/^\/subjects\/(review|lesson|[^\/]+\/lesson|extra_study)/) !== null ||
				 location.pathname.match(/^\/subject-lessons\//) !== null ||
				 location.pathname.match(/^\/recent-mistakes\/[^\/]+\/quiz/) !== null) {
				link.classList.toggle('open');
			} else {
				let menu = document.querySelector('#sitemap__account,[id="#sitemap__account"]');
				let submenu = link.querySelector('.dropdown-menu');
				submenu.style.fontSize = '12px';
				submenu.style.maxHeight = '';
				let submenu_ul = submenu.querySelector(':scope > ul');
				let top = Math.max(0, link.offsetTop);
				link.classList.toggle('open');
				if (link.classList.contains('open')) {
					submenu.style.top = top+'px';
					if (menu.offsetHeight - top < submenu.offsetHeight)
					{
						top = Math.max(0, menu.offsetHeight - submenu.offsetHeight);
						submenu.style.top = top+'px';
						submenu.style.maxHeight = menu.offsetHeight - top;
					}
				}
			}
			// If we opened the menu, listen for off-menu clicks.
			if (link.classList.contains('open')) {
				document.body.addEventListener('click', body_click);
			} else {
				document.body.removeEventListener('click', body_click);
			}
		}
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
		let safe_name = escape_attr(name);
		let safe_text = escape_text(name);
		let submenu = document.querySelector('.scripts-submenu[name="'+safe_name+'"]');
		if (submenu) return submenu;

		let scripts_header = document.querySelector('.scripts-header');
		if (!scripts_header) return;

		if (location.pathname.match(/^\/subjects\/(review|lesson|[^\/]+\/lesson|extra_study)/) !== null ||
			 location.pathname.match(/^\/subject-lessons\//) !== null ||
			 location.pathname.match(/^\/recent-mistakes\/[^\/]+\/quiz/) !== null) {
			scripts_header.insertAdjacentHTML('afterend',
				`<li class="scripts-submenu" name="${safe_name}">
					<a href="#">${safe_text}</a>
					<ul class="dropdown-menu"></ul>
				</li>`
			);
		} else {
			scripts_header.insertAdjacentHTML('beforeend',
				`<li class="sitemap__page scripts-submenu" name="${safe_name}">
				  <a href="#">${safe_text}</a>
				  <div class="sitemap__expandable-chunk dropdown-menu" data-expanded="true" aria-expanded="true">
					<ul class="sitemap__pages">
					</ul>
				  </div>
				<li>`
			);
		}
		let menu_contents = scripts_header.parentElement.querySelectorAll(':scope > .scripts-submenu, :scope > .script-link');
		for (let node of Array.from(menu_contents).sort(sort_name)) node.parentNode.append(node);
		return document.querySelector('.scripts-submenu[name="'+safe_name+'"]');
	}

	//------------------------------
	// Inserts script link into Wanikani menu.
	//------------------------------
	function insert_script_link(config) {
		// Abort if the script already exists
		let link_id = config.name+'_script_link';
		let link_text = escape_text(config.title);
		if (document.querySelector('#'+link_id)) return;
		install_scripts_header();
		let menu, classes, link_html;
		let scripts_header = document.querySelector('.scripts-header');
		if (!scripts_header) return;
		let link = document.createElement('li');
		link.id = link_id;
		link.setAttribute('name', config.name);
		link.innerHTML = '<a href="#">'+link_text+'</a>';
		if (config.submenu) {
			let submenu = install_scripts_submenu(config.submenu);

			// Append the script, and sort the menu.
			if (location.pathname.match(/^\/subjects\/(review|lesson|[^\/]+\/lesson|extra_study)/) !== null ||
				 location.pathname.match(/^\/subject-lessons\//) !== null ||
				 location.pathname.match(/^\/recent-mistakes\/[^\/]+\/quiz/) !== null) {
				menu = submenu.querySelector('.dropdown-menu');
			} else {
				menu = submenu.querySelector('.dropdown-menu>ul');
			}
			classes = ['sitemap__page'];
			if (config.class) classes.push(config.class_html);
			link.setAttribute('class', classes.join(' '));
			link.innerHTML = '<a href="#">'+link_text+'</a>';
			menu.append(link);
		} else {
			classes = ['sitemap__page', 'script-link'];
			if (config.class) classes.push(config.class_html);
			link.setAttribute('class', classes.join(' '));
			if (location.pathname.match(/^\/subjects\/(review|lesson|[^\/]+\/lesson|extra_study)/) !== null ||
				 location.pathname.match(/^\/subject-lessons\//) !== null ||
				 location.pathname.match(/^\/recent-mistakes\/[^\/]+\/quiz/) !== null) {
				scripts_header.after(link);
			} else {
				scripts_header.append(link);
			}
		}
		let menu_contents = scripts_header.parentElement.querySelectorAll(':scope > .scripts-submenu, :scope > .script-link');
		for (let node of Array.from(menu_contents).sort(sort_name)) node.parentNode.append(node);

		// Add a callback for when the link is clicked.
		document.querySelector('#'+link_id).addEventListener('click', function(e){
			e.preventDefault();
			e.stopPropagation();
			document.body.removeEventListener('click', body_click);
			document.querySelector('#scripts-menu').classList.remove('open');
			for (let submenu of document.querySelectorAll('.scripts-submenu')) submenu.classList.remove('open');
			if (document.querySelector('#sitemap__account,[id="#sitemap__account"]')) {
				document.querySelector('#sitemap__account,[id="#sitemap__account"]').parentElement.querySelector('[data-expandable-navigation-target],[data-navigation-section-toggle]').click();
				let nav_toggle = document.querySelector('.navigation__toggle');
				if (nav_toggle.offsetWidth > 0 || nav_toggle.offsetWidth > 0) nav_toggle.click();
			}
			config.on_click(e);
		});
	}

	wkof.ready('document').then(set_ready_state);

	function set_ready_state(){
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.Menu', 'ready');},0);
	}

})(window);