<?php
// Runs Contact Form 7's own wpcf7_autop() over a form template (stdin) exactly
// like WPCF7_ContactForm::form_elements() does: form-tags are swapped for
// inline placeholders, the HTML formatter adds <p>/<br />, tags are restored.
// Usage: php cf7_autop.php <path-to-contact-form-7/includes> < template.txt
define('ABSPATH', __DIR__);
define('WP_DEBUG', false);
function wp_parse_args($a, $d = array()) { return array_merge($d, is_array($a) ? $a : array()); }
function __($s, $d = null) { return $s; }
function wp_json_encode($v, $f = 0) { return json_encode($v, $f); }
function wp_trigger_error($fn, $msg, $lvl = E_USER_NOTICE) { fwrite(STDERR, "$fn: $msg\n"); }
function wp_kses($s, $a) { return $s; }
function wp_kses_allowed_html($c = "") { return array(); }
function apply_filters($h, $v) { return $v; }

$inc = $argv[1];
require $inc . '/html-formatter.php';
require $inc . '/formatting.php';

$input = stream_get_contents(STDIN);
$input = str_replace(array("\r\n", "\r"), "\n", $input);
$placeholders = array();
$types = 'text\*?|email\*?|tel\*?|url\*?|number\*?|range\*?|date\*?|textarea\*?|select\*?|checkbox\*?|radio|acceptance|quiz|file\*?|mfile\*?|signature\*?|submit|hidden';
$input = preg_replace_callback('/(\[?)\[(' . $types . ')(?:[\s]+(.*?))?(?:[\s]+(\/))?\](?:([^[]*?)\[\/\2\])?(\]?)/su', function ($m) use (&$placeholders) {
	if ('[' === $m[1] && ']' === $m[6]) return $m[0];
	$ph = sprintf('<%1$s id="%2$s" />', WPCF7_HTMLFormatter::placeholder_inline, hash('sha256', $m[0]));
	list($ph) = WPCF7_HTMLFormatter::normalize_start_tag($ph);
	$placeholders[$ph] = $m[0];
	return $ph;
}, $input);
$out = wpcf7_autop($input);
echo str_replace(array_keys($placeholders), array_values($placeholders), $out);
