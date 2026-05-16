/*
***Carousel plugin
***The plugin requires at least four images for the carousel
***Pass the number of images when calling this plugin
*/
(function($) {
	$.fn.gallery_slider = function(options) {
	  var _ops = $.extend({
	      imgNum: 5 , //Image count
	      gallery_item_left: '.prev' , //Left button
	      gallery_item_right: '.next' , //Right button
	      gallery_left_middle: '.gallery_left_middle', //Left image container
	      gallery_right_middle: '.gallery_right_middle', //Left image container
	      threeD_gallery_item: '.threeD_gallery_item' //Image container
	  }, options);
	  var _this = $(this),
	  		_imgNum = _ops.imgNum, //Image count
	  		_gallery_item_left = _ops.gallery_item_left, //Left button
	  		_gallery_item_right = _ops.gallery_item_right, //Right button
	  		_gallery_left_middle = _ops.gallery_left_middle, //Left image container
	  		_gallery_right_middle = _ops.gallery_right_middle, //Left image container
	  		_threeD_gallery_item = _ops.threeD_gallery_item; //Image container
	  		
  	//Bind click event to left button
  	_this.find(_gallery_item_left).on('click',function(){
			var idx = parseInt(_this.find(_gallery_left_middle).index());
			//Current display image logic
			_this.find(_threeD_gallery_item).eq(idx).removeClass('gallery_left_middle').addClass('front_side');
			//Execute logic when idx is 0
			_this.find(_threeD_gallery_item).eq(idx == 0 ? idx + _imgNum - 1 : idx - 1).removeClass('gallery_out').addClass('gallery_left_middle');
			//Execute logic when idx is _imgNum - 3
			_this.find(_threeD_gallery_item).eq(idx == _imgNum - 3 ? idx + 2 : idx - _imgNum + 2).removeClass('gallery_right_middle').addClass('gallery_out');
			//Execute logic when idx is _imgNum - 2
			_this.find(_threeD_gallery_item).eq(idx == _imgNum - 2 ? idx + 1 : idx - _imgNum + 1).removeClass('front_side').addClass('gallery_right_middle');
		})
		//Bind click event to right button
		_this.find(_gallery_item_right).on('click',function(){
			var idx = parseInt(_this.find(_gallery_right_middle).index());
			//Current display image logic
			_this.find(_threeD_gallery_item).eq(idx).removeClass('gallery_right_middle').addClass('front_side');
			//Execute logic when idx is 0
			_this.find(_threeD_gallery_item).eq(idx == 0 ? idx + _imgNum - 1 : idx - 1).removeClass('front_side').addClass('gallery_left_middle');
			//Execute logic when idx is 1
			_this.find(_threeD_gallery_item).eq(idx == 1 ? idx + _imgNum - 2 : idx - 2).removeClass('gallery_left_middle').addClass('gallery_out');
			//Execute logic when idx is _imgNum - 2
			_this.find(_threeD_gallery_item).eq(idx == _imgNum - 2 ? idx + 1 : idx - _imgNum + 1).removeClass('gallery_out').addClass('gallery_right_middle');
		})
	};
})(jQuery);