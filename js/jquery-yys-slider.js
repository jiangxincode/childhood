/*
 ***Carousel plugin
 ***For >= 4 images: full 3D 4-slot carousel (left / front / right / out)
 ***For < 4 images: simplified swap mode (front and side toggle on each click)
 */
(function ($) {
  $.fn.gallery_slider = function (options) {
    const _ops = $.extend(
      {
        imgNum: 5, //Image count
        gallery_item_left: ".prev", //Left button
        gallery_item_right: ".next", //Right button
        gallery_left_middle: ".gallery_left_middle", //Left image container
        gallery_right_middle: ".gallery_right_middle", //Left image container
        threeD_gallery_item: ".threeD_gallery_item", //Image container
      },
      options
    );
    const _this = $(this),
      _imgNum = _ops.imgNum, //Image count
      _gallery_item_left = _ops.gallery_item_left, //Left button
      _gallery_item_right = _ops.gallery_item_right, //Right button
      _gallery_left_middle = _ops.gallery_left_middle, //Left image container
      _gallery_right_middle = _ops.gallery_right_middle, //Left image container
      _threeD_gallery_item = _ops.threeD_gallery_item; //Image container

    //Simplified swap mode: works with 2 or 3 images
    if (_imgNum < 4) {
      const swapClasses = "front_side gallery_left_middle gallery_right_middle gallery_out";

      const rotate = (forward) => {
        const $items = _this.find(_threeD_gallery_item);
        const len = $items.length;
        if (len < 2) return;
        const frontIdx = $items.index($items.filter(".front_side").first());
        if (frontIdx < 0) return;
        const step = forward ? 1 : -1;
        const nextIdx = (frontIdx + step + len) % len;
        const sideIdx = (frontIdx - step + len) % len;
        $items.each(function (i) {
          const $el = $(this).removeClass(swapClasses);
          if (i === nextIdx) $el.addClass("front_side");
          else if (i === frontIdx)
            $el.addClass(forward ? "gallery_right_middle" : "gallery_left_middle");
          else if (i === sideIdx && sideIdx !== nextIdx)
            $el.addClass(forward ? "gallery_left_middle" : "gallery_right_middle");
          else $el.addClass("gallery_out");
        });
      };

      _this.find(_gallery_item_left).on("click", () => rotate(false));
      _this.find(_gallery_item_right).on("click", () => rotate(true));
      return;
    }

    //Bind click event to left button
    _this.find(_gallery_item_left).on("click", () => {
      const idx = parseInt(_this.find(_gallery_left_middle).index());
      //Current display image logic
      _this
        .find(_threeD_gallery_item)
        .eq(idx)
        .removeClass("gallery_left_middle")
        .addClass("front_side");
      //Execute logic when idx is 0
      _this
        .find(_threeD_gallery_item)
        .eq(idx == 0 ? idx + _imgNum - 1 : idx - 1)
        .removeClass("gallery_out")
        .addClass("gallery_left_middle");
      //Execute logic when idx is _imgNum - 3
      _this
        .find(_threeD_gallery_item)
        .eq(idx == _imgNum - 3 ? idx + 2 : idx - _imgNum + 2)
        .removeClass("gallery_right_middle")
        .addClass("gallery_out");
      //Execute logic when idx is _imgNum - 2
      _this
        .find(_threeD_gallery_item)
        .eq(idx == _imgNum - 2 ? idx + 1 : idx - _imgNum + 1)
        .removeClass("front_side")
        .addClass("gallery_right_middle");
    });
    //Bind click event to right button
    _this.find(_gallery_item_right).on("click", () => {
      const idx = parseInt(_this.find(_gallery_right_middle).index());
      //Current display image logic
      _this
        .find(_threeD_gallery_item)
        .eq(idx)
        .removeClass("gallery_right_middle")
        .addClass("front_side");
      //Execute logic when idx is 0
      _this
        .find(_threeD_gallery_item)
        .eq(idx == 0 ? idx + _imgNum - 1 : idx - 1)
        .removeClass("front_side")
        .addClass("gallery_left_middle");
      //Execute logic when idx is 1
      _this
        .find(_threeD_gallery_item)
        .eq(idx == 1 ? idx + _imgNum - 2 : idx - 2)
        .removeClass("gallery_left_middle")
        .addClass("gallery_out");
      //Execute logic when idx is _imgNum - 2
      _this
        .find(_threeD_gallery_item)
        .eq(idx == _imgNum - 2 ? idx + 1 : idx - _imgNum + 1)
        .removeClass("gallery_out")
        .addClass("gallery_right_middle");
    });
  };
})(jQuery);
