<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	
	<title>BeoCreate Glyphs</title>
	
	
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
	
	<link rel="stylesheet" type="text/css" href="beolink-extras.css" />
	
	<script src='scripts/modernizr.js'></script>
	
</head>
<body>

<h1>Create</h1>
<h2>Bang &amp; Olufsen</h1>
<div id="icon-area">
<?php
// BLURB OUT ALL ICONS
$iconID = 0;
foreach (glob("symbols-black/*.svg") as $filename)
{
	$readableFilename = substr(explode("/", $filename)[1], 0, -4);
	$iconID++;
	echo "<div class='icon'><img src=".$filename." id='icon-".$iconID."'><span>".$readableFilename."</span></div>";
}
?>
</div>
<?php
echo "<footer>".$iconID." icons</footer>"
?>
</body>
</html>