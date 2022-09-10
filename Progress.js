// ==UserScript==
// @name        Wanikani Open Framework - Progress module
// @namespace   rfindley
// @description Progress module for Wanikani Open Framework
// @version     1.0.11
// @copyright   2022+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	//########################################################################
	//------------------------------
	// Published interface
	//------------------------------
	global.wkof.Progress = {
		update: update_progress,
		popup_delay: get_or_set_popup_delay,
	}
	//########################################################################

	const default_popup_delay = 2500; // Delay before popup will open (in milliseconds).
	var popup_delay = default_popup_delay;
	var show_popup = true;
	var popup_delay_started = false, popup_delay_expired = false, popup_timer;
	var externals_requested = false, externals_loaded = false;
	var progress_bars = {};
	var user_closed = false;
	var dialog_visible = false, dialog;

	//------------------------------
	// Set the delay before the progress dialog pops up.
	//------------------------------
	function get_or_set_popup_delay(delay, silent) {
		if (typeof delay !== 'undefined' && delay !== null) {
			if (delay === 'default') delay = default_popup_delay;
			delay = Number(delay);
			if (Number.isNaN(delay)) throw 'Invalid value for popup_delay';
			show_popup = (delay >= 0);
			localStorage.setItem('wkof.Progress.popup_delay', delay);
			popup_delay = delay;
		}
		if (silent !== true) console.log('popup_delay ' + (show_popup ? ('= ' + popup_delay) : 'is disabled'));
	}

	//------------------------------
	// Update the progress bar.
	//------------------------------
	function update_progress(data) {
		if (data) update_data(data);

		if (!dialog_visible && !have_pending()) return shutdown();

		// We have something pending, but don't show dialog until popup_delay has passed.
		if (!popup_delay_started) return start_popup_delay();

		// Popup delay has passed.  Show progress.
		if (!popup_delay_expired) return;
		update_dialog();
	}

	//------------------------------
	// Update our stored progress bar status
	//------------------------------
	function update_data(data) {
		var bar = progress_bars[data.name];
		if (!bar) progress_bars[data.name] = bar = {label: data.label};
		bar.is_updated = true;
		bar.value = data.value;
		bar.max = data.max;
		if (bar.max === 0) {
			bar.value = 1;
			bar.max = 1;
		}
		// Don't retain items that complete before the dialog pops up.
		if (!popup_delay_expired && (bar.value >= bar.max)) delete progress_bars[data.name];
	}

	//------------------------------
	// Check if some progress is still pending.
	//------------------------------
	function have_pending() {
		var all_done = true;
		for (name in progress_bars) {
			var progress_bar = progress_bars[name];
			if (progress_bar.value < progress_bar.max) all_done = false;
		}
		return !all_done;
	}

	//------------------------------
	// Delay the dialog from popping up until progress takes at least N milliseconds.
	//------------------------------
	function start_popup_delay() {
		get_or_set_popup_delay(localStorage.getItem('wkof.Progress.popup_delay'), true /* silent */);
		if (!show_popup) return;
		popup_delay_started = true;
		popup_timer = setTimeout(function() {
			popup_delay_expired = true;
			update_progress();
		}, popup_delay);
	}

	//------------------------------
	// Update the contents of the progress dialog (if it's currently visible)
	//------------------------------
	function update_dialog() {
		if (!externals_requested) {
			externals_requested = true;
			load_externals()
			.then(function() {
				externals_loaded = true;
				update_progress();
			});
			return;
		}
		if (!externals_loaded) return;
		if (user_closed) return;

		if (!dialog_visible) {
			dialog_visible = true;
			if (!document.querySelector('#wkof_ds')) {
				let ds = document.createElement('div');
				ds.setAttribute('id', 'wkof_ds');
				document.body.prepend(ds);
			}

			dialog = $('<div id="wkof_progbar_dlg" class="wkofs_progress_dlg" style="display:none;"></div>');

			dialog.dialog({
				title: 'Loading Data...',
				minHeight: 20,
				maxHeight: window.innerHeight,
				height: 'auto',
				dialogClass: 'wkof_progbar_dlg',
				modal: false,
				resizable: false,
				autoOpen: false,
				appendTo: '#wkof_ds',
				close: dialog_close
			});
			dialog.dialog('open');
		}

		var all_done = true;
		for (name in progress_bars) {
			var progress_bar = progress_bars[name];
			if (progress_bar.value < progress_bar.max) all_done = false;
			var bar = $('#wkof_progbar_dlg .wkof_progbar_wrap[name="'+name+'"]');
			if (bar.length === 0) {
				bar = $('<div class="wkof_progbar_wrap" name="'+name+'"><label>'+progress_bar.label+'</label><div class="wkof_progbar"></div></div>');
				var bars = $('#wkof_progbar_dlg .wkof_progbar_wrap');
				bars.push(bar[0]);
				$('#wkof_progbar_dlg').append(bars.sort(bar_label_compare));
			}
			if (progress_bar.is_updated) {
				progress_bar.is_updated = false;
				bar.find('.wkof_progbar').progressbar({value: progress_bar.value, max: progress_bar.max});
			}
		}

		if (all_done) shutdown();
	}

	function dialog_close() {
		dialog.dialog('destroy');
		dialog_visible = false;
		user_closed = true;
	}

	//------------------------------
	// Load external support files (jquery UI and stylesheet)
	//------------------------------
	function load_externals() {
		var css_url = wkof.support_files['jqui_wkmain.css'];

		wkof.include('Jquery');
		return wkof.ready('document, Jquery')
			.then(function(){
				return Promise.all([
					wkof.load_script(wkof.support_files['jquery_ui.js'], true /* cache */),
					wkof.load_css(css_url, true /* cache */)
				]);
			})
			.then(function(){
				// Workaround...	https://community.wanikani.com/t/19984/55
				delete $.fn.autocomplete;
			});
	}

	//------------------------------
	// Comparison function for sorting progress bars.
	//------------------------------
	function bar_label_compare(a, b) {
		var a = $(a).find('label').text();
		var b = $(b).find('label').text();
		return a.localeCompare(b);
	}

	//------------------------------
	// Shut down the dialog box and cancel the popup delay timer.
	//------------------------------
	function shutdown() {
		// If popup timer was pending, cancel it.
		if (popup_delay_started && !popup_delay_expired) clearTimeout(popup_timer);
		popup_delay_started = false;
		popup_delay_expired = false;

		// If progress dialog is open, close it.
		if (dialog_visible) dialog.dialog('close');
		user_closed = false;
		progress_bars = {};
	}

	function set_ready_state() {
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.Progress', 'ready');}, 0);
	}
	set_ready_state();

})(window);
