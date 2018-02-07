// ==UserScript==
// @name        Wanikani Open Framework - Settings module
// @namespace   rfindley
// @description Settings module for Wanikani Open Framework
// @version     1.0.0
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
			script_id: config.script_id,
			title: config.title,
			config: config.settings,
		}

		if (publish_context) this.context = context;

		// Create public methods bound to context.
		this.cancel = cancel_btn.bind(context, context);
		this.open = open.bind(context, context);
		this.on_save = config.on_save;
	};

	global.wkof.Settings = Settings;
	//########################################################################

	wkof.settings = {};
	var ready = false;
	var revert_settings = {};

	//------------------------------
	// Convert a config object to html dialog.
	//------------------------------
	function config_to_html(context) {
		context.config_list = {};
		if (wkof.settings[context.script_id] === undefined) wkof.settings[context.script_id] = {};
		var saved = wkof.settings[context.script_id], value;
		var pages = [], depth = 0;

		var html = '';
		for (var name in context.config)
			html += parse_item(name, context.config[name]);
		if (pages.length > 0)
			html = '<div class="wkof_stabs"><ul>'+pages.join('')+'</ul>'+html+'</div>';
		return '<form>'+html+'</form>';

		//============
		function parse_item(name, item) {
			depth++;
			if (typeof item.type !== 'string') return '';
			if (depth == 1 && item.type !== 'page' && pages.length > 0) return '';
			if (typeof item.label !== 'string') item.label = '&lt;untitled&gt;';
			var id = context.script_id+'_'+name;
			var cname,html = '';
			switch (item.type) {
				case 'page':
					if (depth > 1) return;
					if (typeof item.content !== 'object') item.content = {};
					pages.push('<li id="'+id+'_tab"><a href="#'+id+'">'+item.label+'</a></li>');
					html = '<div id="'+id+'">';
					for (cname in item.content) 
						html += parse_item(cname, item.content[cname]);
					html += '</div>';
					break;

				case 'group':
					if (typeof item.content !== 'object') item.content = {};
					html = '<fieldset id="'+id+'" class="wkof_group"><legend>'+item.label+'</legend>';
					for (cname in item.content) 
						html += '<div class="setting_row">'+parse_item(cname, item.content[cname])+'</div>';
					html += '</fieldset>';
					break;

				case 'dropdown':
					context.config_list[name] = item;
					if (typeof item.label === 'string')
						html += '<label for="'+id+'">'+item.label+'</label>';
					html += '<select id="'+id+'" class="setting" name="'+name+'">';
					if (saved[name] === undefined) saved[name] = (item.default || Object.keys(item.content)[0]);
					for (cname in item.content) {
						value = (cname == saved[name] ? ' selected="selected"':'');
						html += '<option name="'+cname+'"'+value+'>'+item.content[cname]+'</option>';
					}
					html += '</select>';
					break;

				case 'checkbox':
					context.config_list[name] = item;
					if (typeof item.label === 'string')
						html += '<label for="'+id+'">'+item.label+'</label>';
					if (saved[name] === undefined) saved[name] = (item.default || false);
					value = (saved[name] === true ? ' checked="checked"':'');
					html += '<input id="'+id+'" class="setting" type="checkbox" name="'+name+'"'+value+'>';
					break;

				case 'number':
				case 'text':
					context.config_list[name] = item;
					if (typeof item.label === 'string')
						html += '<label for="'+id+'">'+item.label+'</label>';
					if (saved[name] === undefined) saved[name] = (item.default || (item.type==='text'?'':'0'));
					html += '<input id="'+id+'" class="setting" type="text" name="'+name+'" value="'+saved[name]+'">'
					break;

				case 'color':
					context.config_list[name] = item;
					if (typeof item.label === 'string')
						html += '<label for="'+id+'">'+item.label+'</label>';
					if (saved[name] === undefined) saved[name] = (item.default || '#000000');
					html += '<input id="'+id+'" class="setting" type="color" name="'+name+'" value="'+saved[name]+'">'
					break;
			}
			depth--;
			return html;
		}
	}

	//------------------------------
	// Open the settings dialog.
	//------------------------------
	function open(context) {
		if (!ready) return;
		if ($('#wkofs_'+context.script_id).length > 0) return;
		var container = $('.footer-adjustment>.container,.dashboard>.container').eq(0);
		var dialog = $('<div id="wkofs_'+context.script_id+'" class="wkof_settings" style="display:none;"></div>');
		dialog.html(config_to_html(context));
		revert_settings = {};

		// We need something to appendTo that our CSS rules can anchor to, so
		// we can avoid overlapping with other instances of Jquery UI.
		if ($('#wkof_ds').length === 0)
			$('body').prepend('<div id="wkof_ds"></div>');

		var width = 500;
		if (window.innerWidth < 510) {
			width = 280;
			dialog.addClass('narrow');
		}
		dialog.dialog({
			title: context.title+' Settings',
			buttons: [
				{text:'Save',click:save_btn.bind(context,context)},
				{text:'Cancel',click:cancel_btn.bind(context,context)}
			],
			width: width,
			maxHeight: window.innerHeight,
			modal: false,
			autoOpen: false,
			appendTo: '#wkof_ds',
			resize: resize.bind(context,context),
			close: close.bind(context,context)
		});

		$('.wkof_stabs').tabs();
		dialog.dialog('open');
		$('#wkofs_'+context.script_id+' .setting').on('change', setting_changed.bind(null,context));

		//============
		function resize(context, event, ui){
			var dialog = $('#wkofs_'+context.script_id);
			var is_narrow = dialog.hasClass('narrow');
			if (is_narrow && ui.size.width >= 510)
				dialog.removeClass('narrow');
			else if (!is_narrow && ui.size.width < 490)
				dialog.addClass('narrow');
		}
	}

	//------------------------------
	// Save button handler.
	//------------------------------
	function save_btn(context) {
		// Make a list of the settings that changed.
		for (var name in revert_settings) {
			if (revert_settings[name] != wkof.settings[context.script_id][name])
				revert_settings[name] = wkof.settings[context.script_id][name];
			else
				delete revert_settings[name];
		}
		if (typeof context.self.on_save === 'function') context.self.on_save(revert_settings);
		wkof.trigger('wkof.settings.save');
		var dialog = $('#wkofs_'+context.script_id);
		context.keep_settings = true;
		dialog.dialog('close');
	}

	//------------------------------
	// Cancel button handler.
	//------------------------------
	function cancel_btn(context) {
		var dialog = $('#wkofs_'+context.script_id);
		dialog.dialog('close');
	}

	//------------------------------
	// Close and destroy the dialog.
	//------------------------------
	function close(context) {
		var dialog = $('#wkofs_'+context.script_id);
		if (!context.keep_settings) {
			// Revert settings
			Object.assign(wkof.settings[context.script_id], revert_settings);
			for (var name in revert_settings) {
				var config = context.config_list[name];
				var elem = document.querySelector('#wkofs_'+context.script_id+' [name="location"]');
				var value = revert_settings[name];
				if (typeof config.on_change === 'function') config.on_change.call(elem, value, config);
			}
		}
		delete context.keep_settings;
		dialog.dialog('destroy');
	}

	//------------------------------
	// Handler for live settings changes.  Handles built-in validation and user callbacks.
	//------------------------------
	function setting_changed(context, event) {
		var elem = $(event.target);
		var name = elem.attr('name');
		var config = context.config_list[name];

		// Extract the value
		var value;
		switch (config.type) {
			case 'dropdown': value = elem.find(':checked').attr('name'); break;
			case 'checkbox': value = elem.is(':checked'); break;
			case 'number': value = Number(elem.val()); break;
			default: value = elem.val(); break;
		}

		if (typeof config.on_change === 'function') config.on_change.call(event.target, value, config);

		// Validation
		var valid = {valid:true, msg:''};
		if (typeof config.validate === 'function') valid = config.validate.call(event.target, value, config);
		if (typeof valid === 'boolean')
			valid = {valid:valid, msg:''};
		else if (typeof valid === 'string')
			valid = {valid:false, msg:valid};
		else if (valid === undefined)
			valid = {valid:true, msg:''};
		switch (config.type) {
			case 'number':
				if (typeof config.min === 'number' && Number(value) < config.min) {
					valid.valid = false;
					if (valid.msg.length === 0) {
						if (typeof config.max === 'number')
							valid.msg = 'Must be between '+config.min+' and '+config.max;
						else
							valid.msg = 'Must be '+config.min+' or higher';
					}
				} else if (typeof config.max === 'number' && Number(value) > config.max) {
					valid.valid = false;
					if (valid.msg.length === 0) {
						if (typeof config.min === 'number')
							valid.msg = 'Must be between '+config.min+' and '+config.max;
						else
							valid.msg = 'Must be '+config.max+' or lower';
					}
				}
				if (!valid)
				break;

			case 'text':
				if (config.match !== undefined && value.match(config.match) === null) {
					valid.valid = false;
					if (valid.msg.length === 0) valid.msg = 'Invalid value'
				}
				break;
		}

		// Style for valid/invalid
		var parent = elem.closest('.setting_row');
		parent.find('.note').remove();
		if (typeof valid.msg === 'string' && valid.msg.length > 0)
			parent.append('<div class="note'+(valid.valid?'':' error')+'">'+valid.msg+'</div>');
		if (!valid.valid) {
			elem.addClass('invalid');
		} else {
			elem.removeClass('invalid');
		}

		if (!(name in revert_settings)) revert_settings[name] = wkof.settings[context.script_id][name];
		wkof.settings[context.script_id][name] = value;
	}

	//------------------------------
	// Load jquery UI and the appropriate CSS based on location.
	//------------------------------
	var css_info;
	if (location.hostname.match(/^(www\.)*wanikani\.com$/) !== null)
		css_url = 'https://raw.githubusercontent.com/rfindley/wanikani-open-framework/master/jqui-wkmain.css';
	else if (location.hostname.match(/^community\.wanikani\.com$/) !== null)
		css_url = 'https://raw.githubusercontent.com/rfindley/wanikani-open-framework/master/jqui-wkforum.css';

	Promise.all([
		wkof.load_script('https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js', true /* cache */),
		wkof.load_css(css_url, true /* cache */)
	])
	.then(function(data){
		ready = true;

		// Notify listeners that we are ready.
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.Settings', 'ready');},0);
	});

})(this);

