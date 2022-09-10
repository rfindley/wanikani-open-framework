// ==UserScript==
// @name        Wanikani Open Framework - Menu module
// @namespace   rfindley
// @description Menu module for Wanikani Open Framework
// @version     1.0.14
// @copyright   2022+, Robin Findley
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
	// Install 'Scripts' header in menu, if not present.
	//------------------------------
	function install_scripts_header() {
		// Abort if already installed.
		if (document.querySelector('.scripts-header')) return false;

		// Install html.
		switch (location.pathname) {
			case '/lesson/session':
			case '/review/session':
			case '/extra_study/session':
				let summary_button = document.querySelector('#summary-button .fa-home').closest('a');

				// Install css and html.
				if (!document.querySelector('style[name="scripts_submenu"]')) {
					document.head.insertAdjacentHTML('beforeend',
						`<style name="scripts_submenu">
						#scripts-menu {text-shadow:none;}
						#scripts-menu.scripts-menu-icon {display:inline-block;}
						#scripts-menu .scripts-icon {display:inline-block;}
						#scripts-menu:not(.open) > .dropdown-menu {display:none;}
						#scripts-menu .scripts-submenu:not(.open) > .dropdown-menu {display:none;}
						#scripts-menu ul.dropdown-menu {position:absolute; background-color:#eee; margin:0; padding:5px 0; list-style-type:none; border:1px solid #333; display:block;}
						#scripts-menu ul.dropdown-menu > li {text-align:left; color:#333; white-space:nowrap; line-height:20px; padding:3px 0; display:list-item;}
						#scripts-menu ul.dropdown-menu > li.scripts-header {text-transform:uppercase; font-size:11px; font-weight:bold; padding:3px 20px; display:list-item;}
						#scripts-menu ul.dropdown-menu > li:hover:not(.scripts-header) {background-color:rgba(0,0,0,0.15)}
						#scripts-menu ul.dropdown-menu a {padding:3px 20px; color:#333; opacity:1;}
						#scripts-menu .scripts-submenu {position:relative;}
						#scripts-menu .scripts-submenu > a:after {content:"\uf0da"; font-family:"FontAwesome"; position:absolute; top:0; right:0; padding:3px 4px 3px 0;}
						#scripts-menu .scripts-submenu .dropdown-menu {left:100%; top:-6px;}
						</style>`
					);
				}

				summary_button.insertAdjacentHTML('afterend',
					`<div id="scripts-menu" class="scripts-menu-icon">
						<a class="scripts-icon" href="#"><i class="fa fa-gear" title="Script Menu"></i></a>
						<ul class="dropdown-menu">
							<li class="scripts-header">Script Menu</li>
						</ul>
					</div>`
				);
				top_menu = document.querySelector('#scripts-menu');
				let scripts_icon = document.querySelector('#scripts-menu > a.scripts-icon');

				function scripts_icon_click(e) {
					top_menu.classList.toggle('open');
					if (top_menu.classList.contains('open')) document.body.addEventListener('click', body_click);
					e.stopPropagation();
				}

				scripts_icon.addEventListener('click', scripts_icon_click);
				break;

			default:
				// Install css and html.
				top_menu = document.querySelector('button[class$="account"]');
				if (!top_menu) return;
				if (!document.querySelector('style[name="scripts_submenu"]')) {
					document.head.insertAdjacentHTML('beforeEnd',
						`<style name="scripts_submenu">
						.sitemap__section.scripts-noposition {position:initial;}
						.scripts-submenu>.dropdown-menu {display:none;}
						.scripts-submenu.open>.dropdown-menu {display:block;position:absolute;top:0px;margin-top:0;left:-8px;transform:scale(1) translateX(-100%);min-width:200px}
						.scripts-submenu .dropdown-menu:before {left:100%;top:12px;z-index:-1;}
						.scripts-submenu .dropdown-menu .sitemap__pages {padding:5px 15px 0px 15px;}
						.scripts-submenu .dropdown-menu .sitemap__page:last-child {margin-bottom:0;}
						.scripts-submenu>a:before {content:"\uf0d9 "; font-family:"FontAwesome";}
						@media (max-width: 979px) {
						  .scripts-submenu>a:before {content:"";}
						  .scripts-submenu>.dropdown-menu {display:contents;position:initial;top:initial;margin-top:initial;left:initial;transform:none;min-width:initial}
						}
						</style>`
					);
				}
				document.querySelector('.user-summary').insertAdjacentHTML('afterend',
					`<li id="scripts-menu" class="sitemap__section sitemap__section--subsection scripts-noposition">
					  <h3 class="sitemap__section-header--subsection">Scripts</h3>
					  <ul class="sitemap__pages scripts-header"></ul>
					</li>`
				);
				break;
		}

		// Click to open/close sub-menu.
		scripts_menu = document.querySelector('#scripts-menu');
		scripts_menu.addEventListener('click', submenu_click);

		function submenu_click(e){
			if (!e.target.matches('.scripts-submenu>a')) return false;
			var link = e.target.parentElement;
			for (let submenu of link.parentElement.querySelectorAll('.scripts-submenu.open')) {
				if (submenu !== link) submenu.classList.remove('open');
			};
			if (location.pathname.match(/^\/(review|lesson|extra_study)\/session/) === null) {
				var menu = document.querySelector('#sitemap__account,[id="#sitemap__account"]');
				var submenu = link.querySelector('.dropdown-menu');
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
			} else {
				link.classList.toggle('open');
			}
			// If we opened the menu, listen for off-menu clicks.
			if (link.classList.contains('open')) {
				document.body.addEventListener('click', body_click);
			} else {
				document.body.removeEventListener('click', body_click);
			}
			e.stopPropagation();
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
		var safe_name = escape_attr(name);
		var safe_text = escape_text(name);
		var submenu = document.querySelector('.scripts-submenu[name="'+safe_name+'"]');
		if (submenu) return submenu;

		let scripts_header = document.querySelector('.scripts-header');
		if (!scripts_header) return;

		if (location.pathname.match(/^\/(review|lesson|extra_study)\/session/) !== null) {
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
		var link_id = config.name+'_script_link';
		var link_text = escape_text(config.title);
		if (document.querySelector('#'+link_id)) return;
		install_scripts_header();
		var menu, classes, link_html;
		let scripts_header = document.querySelector('.scripts-header');
		if (!scripts_header) return;
		let link = document.createElement('li');
		link.id = link_id;
		link.setAttribute('name', config.name);
		link.innerHTML = '<a href="#">'+link_text+'</a>';
		if (config.submenu) {
			var submenu = install_scripts_submenu(config.submenu);

			// Append the script, and sort the menu.
			if (location.pathname.match(/^\/(review|lesson|extra_study)\/session/) !== null) {
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
			if (location.pathname.match(/^\/(review|lesson|extra_study)\/session/) !== null) {
				scripts_header.after(link);
			} else {
				scripts_header.append(link);
			}
		}
		let menu_contents = scripts_header.parentElement.querySelectorAll(':scope > .scripts-submenu, :scope > .script-link');
		for (let node of Array.from(menu_contents).sort(sort_name)) node.parentNode.append(node);

		// Add a callback for when the link is clicked.
		document.querySelector('#'+link_id).addEventListener('click', function(e){
			document.body.removeEventListener('click', body_click);
			document.querySelector('#scripts-menu').classList.remove('open');
			for (let submenu of document.querySelectorAll('.scripts-submenu')) submenu.classList.remove('open');
			if (document.querySelector('#sitemap__account,[id="#sitemap__account"]')) {
				document.querySelector('#sitemap__account,[id="#sitemap__account"]').parentElement.querySelector('[data-expandable-navigation-target],[data-navigation-section-toggle]').click();
				var nav_toggle = document.querySelector('.navigation__toggle');
				if (nav_toggle.offsetWidth > 0 || nav_toggle.offsetWidth > 0) nav_toggle.click();
			}
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
