// ==UserScript==
// @name        Wanikani Open Framework - Settings module
// @namespace   rfindley
// @description Settings module for Wanikani Open Framework
// @version     1.0.14
// @copyright   2018+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	const publish_context = false; // Set to 'true' to make context public.

	//########################################################################
	//------------------------------
	// Constructor
	//------------------------------
	function Settings(config) {
		var context = {
			self: this,
			cfg: config,
		}
		if (!config.content) config.content = config.settings;

		if (publish_context) this.context = context;

		// Create public methods bound to context.
		this.cancel = cancel_btn.bind(context, context);
		this.open = open.bind(context, context);
		this.close = close.bind(context, context);
		this.load = load_settings.bind(context, context);
		this.save = save_settings.bind(context, context);
		this.refresh = refresh.bind(context, context);
		this.background = Settings.background;
	};

	global.wkof.Settings = Settings;
	Settings.save = save_settings;
	Settings.load = load_settings;
	Settings.background = {
		open: open_background,
		close: close_background,
	}
	//########################################################################

	wkof.settings = {};
	var ready = false;

	//------------------------------
	// Convert a config object to html dialog.
	//------------------------------
	function config_to_html(context) {
		context.config_list = {};
		var base = wkof.settings[context.cfg.script_id];
		if (base === undefined) wkof.settings[context.cfg.script_id] = base = {};

		var html = '', item, child_passback = {};
		var id = context.cfg.script_id+'_dialog';
		for (var name in context.cfg.content) {
			var item = context.cfg.content[name];
			html += parse_item(name, context.cfg.content[name], child_passback);
		}
		if (child_passback.tabs)
			html = assemble_pages(id, child_passback.tabs, child_passback.pages) + html;
		return '<form>'+html+'</form>';

		//============
		function parse_item(name, item, passback) {
			if (typeof item.type !== 'string') return '';
			var id = context.cfg.script_id+'_'+name;
			var cname, html = '', value, child_passback, non_page = '';
			switch (item.type) {
				case 'tabset':
					child_passback = {};
					for (cname in item.content) 
						non_page += parse_item(cname, item.content[cname], child_passback);
					if (child_passback.tabs)
						html = assemble_pages(id, child_passback.tabs, child_passback.pages);
					break;

				case 'page':
					if (typeof item.content !== 'object') item.content = {};
					if (!passback.tabs) {
						passback.tabs = [];
						passback.pages = [];
					}
					passback.tabs.push('<li id="'+id+'_tab"'+to_title(item.hover_tip)+'><a href="#'+id+'">'+item.label+'</a></li>');
					child_passback = {};
					for (cname in item.content) 
						non_page += parse_item(cname, item.content[cname], child_passback);
					if (child_passback.tabs)
						html = assemble_pages(id, child_passback.tabs, child_passback.pages);
					passback.pages.push('<div id="'+id+'">'+html+non_page+'</div>');
					passback.is_page = true;
					html = '';
					break;

				case 'group':
					if (typeof item.content !== 'object') item.content = {};
					child_passback = {};
					for (cname in item.content) 
						non_page += parse_item(cname, item.content[cname], child_passback);
					if (child_passback.tabs)
						html = assemble_pages(id, child_passback.tabs, child_passback.pages);
					html = '<fieldset id="'+id+'" class="wkof_group"><legend>'+item.label+'</legend>'+html+non_page+'</fieldset>';
					break;

				case 'dropdown':
				case 'list':
					var classes = 'setting', attribs = '';
					context.config_list[name] = item;
					value = get_value(context, base, name);
					if (value === undefined) {
						if (item.default !== undefined) {
							value = item.default;
						} else {
							if (item.multi === true) {
								value = {};
								Object.keys(item.content).forEach(function(key){
									value[key] = false;
								});
							} else {
								value = Object.keys(item.content)[0];
							}
						}
						set_value(context, base, name, value);
					}
					if (item.type === 'list') {
						classes += ' list';
						attribs += ' size="'+(item.size || Object.keys(item.content).length || 4)+'"';
						if (item.multi === true) attribs += ' multiple';
					}
					html = '<select id="'+id+'" name="'+name+'" class="'+classes+'"'+attribs+to_title(item.hover_tip)+'>';
					for (cname in item.content)
						html += '<option name="'+cname+'">'+escape_text(item.content[cname])+'</option>';
					html += '</select>';
					html = make_label(item) + wrap_right(html);
					html = wrap_row(html, item.full_width, item.hover_tip);
					break;

				case 'checkbox':
					context.config_list[name] = item;
					html = make_label(item);
					value = get_value(context, base, name);
					if (value === undefined) {
						value = (item.default || false);
						set_value(context, base, name, value);
					}
					html += wrap_right('<input id="'+id+'" class="setting" type="checkbox" name="'+name+'">');
					html = wrap_row(html, item.full_width, item.hover_tip);
					break;

				case 'input':
				case 'number':
				case 'text':
					var itype = item.type;
					if (itype === 'input') itype = item.subtype || 'text';
					context.config_list[name] = item;
					html += make_label(item);
					value = get_value(context, base, name);
					if (value === undefined) {
						var is_number = (item.type==='number' || item.subtype==='number');
						value = (item.default || (is_number==='number'?0:''));
						set_value(context, base, name, value);
					}
					html += wrap_right('<input id="'+id+'" class="setting" type="'+itype+'" name="'+name+'"'+(item.placeholder?' placeholder="'+escape_attr(item.placeholder)+'"':'')+'>');
					html = wrap_row(html, item.full_width, item.hover_tip);
					break;

				case 'color':
					context.config_list[name] = item;
					html += make_label(item);
					value = get_value(context, base, name);
					if (value === undefined) {
						value = (item.default || '#000000');
						set_value(context, base, name, value);
					}
					html += wrap_right('<input id="'+id+'" class="setting" type="color" name="'+name+'">');
					html = wrap_row(html, item.full_width, item.hover_tip);
					break;

				case 'button':
					context.config_list[name] = item;
					html += make_label(item);
					var text = escape_text(item.text || 'Click');
					html += wrap_right('<button type="button" class="setting" name="'+name+'">'+text+'</button>');
					html = wrap_row(html, item.full_width, item.hover_tip);
					break;

				case 'divider':
					html += '<hr>';
					break;

				case 'section':
					html += '<section>'+(item.label || '')+'</section>';
					break;

				case 'html':
					html += make_label(item);
					html += item.html;
					switch (item.wrapper) {
						case 'row': html = wrap_row(html, null, item.hover_tip); break;
						case 'left': html = wrap_left(html); break;
						case 'right': html = wrap_right(html); break;
					}
					break;
			}
			return html;

			function make_label(item) {
				if (typeof item.label !== 'string') return '';
				return wrap_left('<label for="'+id+'">'+item.label+'</label>');
			}
		}

		//============
		function assemble_pages(id, tabs, pages) {return '<div id="'+id+'" class="wkof_stabs"><ul>'+tabs.join('')+'</ul>'+pages.join('')+'</div>';}
		function wrap_row(html,full,hover_tip) {return '<div class="row'+(full?' full':'')+'"'+to_title(hover_tip)+'>'+html+'</div>';}
		function wrap_left(html) {return '<div class="left">'+html+'</div>';}
		function wrap_right(html) {return '<div class="right">'+html+'</div>';}
		function escape_text(text) {return text.replace(/[<>]/g, function(ch) {var map={'<':'&lt','>':'&gt;'}; return map[ch];});}
		function escape_attr(text) {return text.replace(/"/g, '&quot;');}
		function to_title(tip) {if (!tip) return ''; return ' title="'+tip.replace(/"/g,'&quot;')+'"';}
	}

	//------------------------------
	// Open the settings dialog.
	//------------------------------
	function open(context) {
		if (!ready) return;
		if ($('#wkofs_'+context.cfg.script_id).length > 0) return;
		install_anchor();
		if (context.cfg.background !== false) open_background();
		var dialog = $('<div id="wkofs_'+context.cfg.script_id+'" class="wkof_settings" style="display:none;"></div>');
		dialog.html(config_to_html(context));

		var width = 500;
		if (window.innerWidth < 510) {
			width = 280;
			dialog.addClass('narrow');
		}
		dialog.dialog({
			title: context.cfg.title,
			buttons: [
				{text:'Save',click:save_btn.bind(context,context)},
				{text:'Cancel',click:cancel_btn.bind(context,context)}
			],
			width: width,
			maxHeight: document.body.clientHeight,
			modal: false,
			autoOpen: false,
			appendTo: '#wkof_ds',
			resize: resize.bind(context,context),
			close: close.bind(context,context)
		});
		$(dialog.dialog('widget')).css('position','fixed');

		$('.wkof_stabs').tabs({activate:tab_activated.bind(null,context)});
		var settings = wkof.settings[context.cfg.script_id];
		if (settings && settings.wkofs_active_tabs instanceof Array) {
			var active_tabs = settings.wkofs_active_tabs;
			for (var tab_idx = 0; tab_idx < active_tabs.length; tab_idx++) {
				var tab = $(active_tabs[tab_idx]);
				tab.closest('.ui-tabs').tabs({active:tab.index()});
			}
		}

		dialog.dialog('open');
		var dialog_elem = $('#wkofs_'+context.cfg.script_id);
		dialog_elem.find('.setting[multiple]').on('mousedown', toggle_multi.bind(null,context));
		dialog_elem.find('.setting').on('change', setting_changed.bind(null,context));
		dialog_elem.find('form').on('submit', function(){return false;});
		dialog_elem.find('button.setting').on('click', setting_button_clicked.bind(null,context));

		if (typeof context.cfg.pre_open === 'function') context.cfg.pre_open(dialog);
		context.reversions = $.extend(true,{},wkof.settings[context.cfg.script_id]);
		refresh(context);

		//============
		function tab_activated(context, event, ui) {
			var dialog = $('#wkofs_'+context.cfg.script_id);
			var wrapper = $(dialog.dialog('widget'));
			if (wrapper.outerHeight() + wrapper.position().top > document.body.clientHeight) {
				dialog.dialog('option', 'maxHeight', document.body.clientHeight);
			}
		}

		function resize(context, event, ui){
			var dialog = $('#wkofs_'+context.cfg.script_id);
			var is_narrow = dialog.hasClass('narrow');
			if (is_narrow && ui.size.width >= 510)
				dialog.removeClass('narrow');
			else if (!is_narrow && ui.size.width < 490)
				dialog.addClass('narrow');
		}

		function toggle_multi(context, e) {
			if (e.button != 0) return true;
			var multi = $(e.currentTarget);
			var scroll = e.currentTarget.scrollTop;
			e.target.selected = !e.target.selected;
			setTimeout(function(){
				e.currentTarget.scrollTop = scroll;
				multi.focus();
			},0);
			return setting_changed(context, e);
		}

		function setting_button_clicked(context, e) {
			var name = e.target.attributes.name.value;
			var item = context.config_list[name];
			if (typeof item.on_click === 'function')
				item.on_click.call(e, name, item, setting_changed.bind(context, context, e));
		}
	}

	//------------------------------
	// Open the settings dialog.
	//------------------------------
	function save_settings(context) {
		var script_id = (typeof context === 'string' ? context : context.cfg.script_id);
		var settings = wkof.settings[script_id];
		if (!settings) return Promise.resolve();
		return wkof.file_cache.save('wkof.settings.'+script_id, settings);
	}

	//------------------------------
	// Open the settings dialog.
	//------------------------------
	function load_settings(context, defaults) {
		var script_id = (typeof context === 'string' ? context : context.cfg.script_id);
		return wkof.file_cache.load('wkof.settings.'+script_id)
		.then(finish, finish.bind(null,{}));

		function finish(settings) {
			if (defaults)
				wkof.settings[script_id] = $.extend(true, {}, defaults, settings);
			else
				wkof.settings[script_id] = settings;
			return wkof.settings[script_id];
		}
	}

	//------------------------------
	// Save button handler.
	//------------------------------
	function save_btn(context, e) {
		var script_id = context.cfg.script_id;
		var dialog = $('#wkofs_'+script_id);
		var settings = wkof.settings[script_id];
		if (settings) {
			var active_tabs = dialog.find('.ui-tabs-active').toArray().map(function(tab){return '#'+tab.attributes.id.value});
			if (active_tabs.length > 0) settings.wkofs_active_tabs = active_tabs;
		}
		if (context.cfg.autosave === undefined || context.cfg.autosave === true) save_settings(context);
		if (typeof context.cfg.on_save === 'function') context.cfg.on_save(wkof.settings[context.cfg.script_id]);
		wkof.trigger('wkof.settings.save');
		context.keep_settings = true;
		dialog.dialog('close');
	}

	//------------------------------
	// Cancel button handler.
	//------------------------------
	function cancel_btn(context) {
		var dialog = $('#wkofs_'+context.cfg.script_id);
		dialog.dialog('close');
		if (typeof context.cfg.on_cancel === 'function') context.cfg.on_cancel(wkof.settings[context.cfg.script_id]);
	}

	//------------------------------
	// Close and destroy the dialog.
	//------------------------------
	function close(context, keep_settings) {
		var dialog = $('#wkofs_'+context.cfg.script_id);
		if (!context.keep_settings && keep_settings !== true) {
			// Revert settings
			wkof.settings[context.cfg.script_id] = $.extend(true,{},context.reversions);
			delete context.reversions;
		}
		delete context.keep_settings;
		dialog.dialog('destroy');
		if (context.cfg.background !== false) close_background();
		if (typeof context.cfg.on_close === 'function') context.cfg.on_close(wkof.settings[context.cfg.script_id]);
	}

	//------------------------------
	// Update the dialog to reflect changed settings.
	//------------------------------
	function refresh(context) {
		var script_id = context.cfg.script_id;
		var settings = wkof.settings[script_id];
		var dialog = $('#wkofs_'+script_id);
		for (var name in context.config_list) {
			var elem = dialog.find('#'+script_id+'_'+name);
			var config = context.config_list[name];
			var value = get_value(context, settings, name);
			switch (config.type) {
				case 'dropdown':
				case 'list':
					if (config.multi === true) {
						elem.find('option').each(function(i,e){
							var opt_name = e.getAttribute('name') || '#'+e.index;
							e.selected = value[opt_name];
						});
					} else {
						elem.find('option[name="'+value+'"]').prop('selected', true);
					}
					break;

				case 'checkbox':
					elem.prop('checked', value);
					break;

				default:
					elem.val(value);
					break;
			}
		}
		if (typeof context.cfg.on_refresh === 'function') context.cfg.on_refresh(wkof.settings[context.cfg.script_id]);
	}

	//------------------------------
	// Handler for live settings changes.  Handles built-in validation and user callbacks.
	//------------------------------
	function setting_changed(context, event) {
		var elem = $(event.currentTarget);
		var name = elem.attr('name');
		var item = context.config_list[name];
		var config;

		// Extract the value
		var value;
		var itype = ((item.type==='input' && item.subtype==='number') ? 'number' : item.type);
		switch (itype) {
			case 'dropdown':
			case 'list':
				if (item.multi === true) {
					value = {};
					elem.find('option').each(function(i,e){
						var opt_name = e.getAttribute('name') || '#'+e.index;
						value[opt_name] = e.selected;
					});
				} else {
					value = elem.find(':checked').attr('name');
				}
				break;
			case 'checkbox': value = elem.is(':checked'); break;
			case 'number': value = Number(elem.val()); break;
			default: value = elem.val(); break;
		}

		// Validation
		var valid = {valid:true, msg:''};
		if (typeof item.validate === 'function') valid = item.validate.call(event.target, value, item);
		if (typeof valid === 'boolean')
			valid = {valid:valid, msg:''};
		else if (typeof valid === 'string')
			valid = {valid:false, msg:valid};
		else if (valid === undefined)
			valid = {valid:true, msg:''};
		switch (itype) {
			case 'number':
				if (typeof item.min === 'number' && Number(value) < item.min) {
					valid.valid = false;
					if (valid.msg.length === 0) {
						if (typeof item.max === 'number')
							valid.msg = 'Must be between '+item.min+' and '+item.max;
						else
							valid.msg = 'Must be '+item.min+' or higher';
					}
				} else if (typeof item.max === 'number' && Number(value) > item.max) {
					valid.valid = false;
					if (valid.msg.length === 0) {
						if (typeof item.min === 'number')
							valid.msg = 'Must be between '+item.min+' and '+item.max;
						else
							valid.msg = 'Must be '+item.max+' or lower';
					}
				}
				if (!valid)
				break;

			case 'text':
				if (item.match !== undefined && value.match(item.match) === null) {
					valid.valid = false;
					if (valid.msg.length === 0)
						valid.msg = item.error_msg || 'Invalid value';
				}
				break;
		}

		// Style for valid/invalid
		var parent = elem.closest('.right');
		parent.find('.note').remove();
		if (typeof valid.msg === 'string' && valid.msg.length > 0)
			parent.append('<div class="note'+(valid.valid?'':' error')+'">'+valid.msg+'</div>');
		if (!valid.valid) {
			elem.addClass('invalid');
		} else {
			elem.removeClass('invalid');
		}

		var script_id = context.cfg.script_id;
		var settings = wkof.settings[script_id];
		if (valid.valid) {
			if (item.no_save !== true) set_value(context, settings, name, value);
			if (typeof item.on_change === 'function') item.on_change.call(event.target, name, value, item);
			if (typeof context.cfg.on_change === 'function') context.cfg.on_change.call(event.target, name, value, item);
			if (item.refresh_on_change === true) refresh(context);
		}

		return false;
	}

	function get_value(context, base, name){
		var item = context.config_list[name];
		var evaluate = (item.path !== undefined);
		var path = (item.path || name);
		try {
			if (!evaluate) return base[path];
			return eval(path.replace(/@/g,'base.'));
		} catch(e) {return;}
	}

	function set_value(context, base, name, value) {
		var item = context.config_list[name];
		var evaluate = (item.path !== undefined);
		var path = (item.path || name);
		try {
			if (!evaluate) return base[path] = value;
			var depth=0, new_path='', param, c;
			for (var idx = 0; idx < path.length; idx++) {
				c = path[idx];
				if (c === '[') {
					if (depth++ === 0) {
						new_path += '[';
						param = '';
					} else {
						param += '[';
					}
				} else if (c === ']') {
					if (--depth === 0) {
						new_path += JSON.stringify(eval(param)) + ']';
					} else {
						param += ']';
					}
				} else {
					if (c === '@') c = 'base.';
					if (depth === 0)
						new_path += c;
					else
						param += c;
				}
			}
			eval(new_path + '=value');
		} catch(e) {return;}
	}

	function install_anchor() {
		var anchor = $('#wkof_ds');
		if (anchor.length === 0) {
			anchor = $('<div id="wkof_ds"></div></div>');
			$('body').prepend(anchor);
		}
		return anchor;
	}

	function open_background() {
		var anchor = install_anchor();
		var bkgd = anchor.find('> #wkofs_bkgd');
		if (bkgd.length === 0) {
			bkgd = $('<div id="wkofs_bkgd" refcnt="0"></div>');
			anchor.prepend(bkgd);
		}
		var refcnt = Number(bkgd.attr('refcnt'));
		bkgd.attr('refcnt', refcnt + 1);
	}

	function close_background() {
		var bkgd = $('#wkof_ds > #wkofs_bkgd');
		if (bkgd.length === 0) return;
		var refcnt = Number(bkgd.attr('refcnt'));
		if (refcnt <= 0) return;
		bkgd.attr('refcnt', refcnt - 1);
	}

	//------------------------------
	// Load jquery UI and the appropriate CSS based on location.
	//------------------------------
	var css_url = wkof.support_files['jqui_wkmain.css'];

	wkof.ready('document')
	.then(function(){
		return Promise.all([
			wkof.load_script(wkof.support_files['jquery_ui.js'], true /* cache */),
			wkof.load_css(css_url, true /* cache */)
		]);
	})
	.then(function(data){
		ready = true;

		// Workaround...  https://community.wanikani.com/t/19984/55
		delete $.fn.autocomplete;

		// Notify listeners that we are ready.
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.Settings', 'ready');},0);
	});

})(this);
