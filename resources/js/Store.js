class Store {
    keyword = "";
    cartList = [];
    $cartList = $("#cart-list");
    $storeList = $("#store-list");
    $dropArea = $("#drop-area");

    constructor(){
        this.init();
        this.setEvents();
    }
    async init(){
        this.products = await this.getProducts();

        this.storeUpdate();
    }

    getProducts(){
        return fetch("/resources/store.json")
            .then(res => res.json())
            .then(jsonList => jsonList.map(json => new Product(this, json)));
    }

    storeUpdate(){
        let viewList = this.products.map(item => item.init());

        if(this.keyword !== ""){
            let regex = new RegExp(this.keyword, "g");
            viewList = viewList.filter(item => regex.test(item.json.product_name) || regex.test(item.json.brand))
                .map(item => {
                    item.product_name = item.json.product_name.replace(regex, m1 => `<span class="bg-gold">${m1}</span>`);
                    item.brand = item.json.brand.replace(regex, m1 => `<span class="bg-gold">${m1}</span>`);
                    return item;
                });
        }
    
        if(viewList.length > 0){
            this.$storeList.html("");
            viewList.forEach(item => {
                item.storeUpdate();
                this.$storeList.append(item.$storeElem);
            });
        } else {
            this.$storeList.html(`<div class="w-100 py-5 text-center fx-n2 text-muted">일치하는 상품이 없습니다.</div>`);
        }
    }

    get totalPrice(){
        return this.cartList.reduce((p, c) => p + c.totalPrice, 0);
    }

    cartUpdate(){
        if(this.cartList.length > 0){
            this.$cartList.html("");
            this.cartList.forEach(item => {
                item.cartUpdate();
                this.$cartList.append(item.$cartElem);
            });
        } else {
            this.$cartList.html(`<div class="w-100 py-5 text-center fx-n2 text-muted">장바구니에 담긴 상품이 없습니다.</div>`);
        }

        $(".total-price").text(this.totalPrice.toLocaleString());
    }

    setEvents(){
        let dragTarget, startPoint;
        this.$storeList.on("dragstart", ".image", e => {
            e.preventDefault();

            dragTarget = e.currentTarget;
            startPoint = [e.pageX, e.pageY];
            $(dragTarget).css({
                transition: "none",
                position: "relative",
                zIndex: "2000"
            });
        });

        $(window).on("mousemove", e => {
            if(!dragTarget || !startPoint || e.which !== 1) return;
            
            $(dragTarget).css({
                left: e.pageX - startPoint[0] + "px",
                top: e.pageY - startPoint[1] + "px",
            });
        });

        let timeout;
        $(window).on("mouseup", e => {
            if(!dragTarget || !startPoint || e.which !== 1) return;

            let {left, top} = this.$dropArea.offset();
            let width = this.$dropArea.width();
            let height = this.$dropArea.height();

            if(left <= e.pageX && e.pageX <= left + width && top <= e.pageY && e.pageY <= top + height){
                if(timeout){
                    clearTimeout(timeout);
                }
                this.$dropArea.removeClass("success");
                this.$dropArea.removeClass("error");

                let target = dragTarget;

                let product = this.products.find(item => item.id == target.dataset.id);
                
                if(this.cartList.some(item => item == product)){
                    this.$dropArea.addClass("error");

                    $(dragTarget).animate({
                        left: 0,
                        top: 0
                    }, 350, function(){
                        this.style.zIndex = "0";
                    });
                } else {
                    this.$dropArea.addClass("success");
                    
                    product.buyCount = 1;
                    this.cartList.push(product);
                    this.cartUpdate();
                    
                    $(dragTarget).css({
                        transform: "scale(0)",
                        transition: "transform 0.5s"
                    });
                    
                    setTimeout(() => {
                        $(target).css({
                            transform: "scale(1)",
                            zIndex: "0",
                            left: 0,
                            top: 0,
                        });
                    }, 500);
                }

                timeout = setTimeout(() => {
                    this.$dropArea.removeClass("success");
                    this.$dropArea.removeClass("error");
                }, 1500);
            } else {
                $(dragTarget).animate({
                    left: 0,
                    top: 0
                }, 350, function(){
                    this.style.zIndex = "0";
                });
            }
            
            dragTarget = startPoint = null;
        });


        this.$cartList.on("input", ".buy-count", e => {
            let value = parseInt(e.target.value);

            if(isNaN(value) || ! value || value < 1){
                value = 1;
            }

            let product = this.cartList.find(item => item.id == e.target.dataset.id);
            product.buyCount = value;
            this.cartUpdate();
            
            e.target.focus();
        });

        this.$cartList.on("click", ".remove", e => {
            let idx = this.cartList.findIndex(item => item.id == e.currentTarget.dataset.id);
            if(idx >= 0){
                let product = this.cartList[idx];
                product.buyCount = 0;

                this.cartList.splice(idx, 1);
                this.cartUpdate();
            }
        });


        $("#buy-modal form").on("submit", e => {
            e.preventDefault();
            
            const PADDING = 30;
            const TEXT_SIZE = 18;
            const TEXT_GAP = 20;
            
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            ctx.font = `${TEXT_SIZE}px 나눔스퀘어, sans-serif`;

            let now = new Date();
            let text_time = `구매일시           ${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
            let text_price = `총 합계           ${this.totalPrice.toLocaleString()}원`;
            
            let viewList = [
                ...this.cartList.map(item => {
                    let text = `${item.json.product_name}            ${item.price.toLocaleString()}원 × ${item.buyCount.toLocaleString()}개 = ${item.totalPrice.toLocaleString()}원`;
                    let width = ctx.measureText(text).width;
                    return {text, width};
                }),
                {text: text_time, width: ctx.measureText(text_time).width },
                {text: text_price, width: ctx.measureText(text_price).width }
            ];

            let max_w = viewList.reduce((p, c) => Math.max(p, c.width), viewList[0].width);
            
            canvas.width = max_w + PADDING * 2;
            canvas.height = (TEXT_SIZE + TEXT_GAP) * viewList.length + PADDING * 2;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#333";
            ctx.font = `${TEXT_SIZE}px 나눔스퀘어, sans-serif`;
            
            viewList.forEach(({text}, i) => {
                ctx.fillText(text, PADDING, PADDING + TEXT_GAP * i + TEXT_SIZE * (i + 1));
            });

            let src = canvas.toDataURL("image/jpeg");
            $("#view-modal img").attr("src", src);
            $("#view-modal").modal("show");
            $("#buy-modal").modal("hide");

            this.cartList.forEach(item => item.buyCount = 0);
            this.cartList = [];
            this.cartUpdate();
        });


        $(".search input").on("input", e => {
            this.keyword = e.target.value
                .replace(/([\^\$\.*+?\[\]\(\)\\\\\\/])/g, "\\$1")
                .replace(/(ㄱ)/g, "[가-깋]")
                .replace(/(ㄴ)/g, "[나-닣]")
                .replace(/(ㄷ)/g, "[다-딯]")
                .replace(/(ㄹ)/g, "[라-맇]")
                .replace(/(ㅁ)/g, "[마-밓]")
                .replace(/(ㅂ)/g, "[바-빟]")
                .replace(/(ㅅ)/g, "[사-싷]")
                .replace(/(ㅇ)/g, "[아-잏]")
                .replace(/(ㅈ)/g, "[자-짛]")
                .replace(/(ㅊ)/g, "[차-칳]")
                .replace(/(ㅋ)/g, "[카-킿]")
                .replace(/(ㅌ)/g, "[타-팋]")
                .replace(/(ㅍ)/g, "[파-핗]")
                .replace(/(ㅎ)/g, "[하-힣]")
            this.storeUpdate();
        }); 
    }
}

window.onload = () => {
    window.store = new Store();
}