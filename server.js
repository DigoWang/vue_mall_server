const express = require("express"),
  app = express(),
  cors = require("cors"),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  { v4: uuid } = require("uuid");

const { response } = require("express");
// 插入数据
const goodsData = require("./goods.json");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

mongoose.connect("mongodb://127.0.0.1:27017/wendy_login", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("open", () => {
  console.log("Mongoose连接成功");

  const adminSchema = new mongoose.Schema({
    id: String,
    username: String,
    password: String,
  });
  const bannerSchema = new mongoose.Schema({
    id: Number,
    url: String,
    type: String,
  });
  const goodsSchema = new mongoose.Schema({
    brandCode: String,
    brandName: String,
    categoryInfo: Object,
    imageInfo: Object,
    materialUrl: String,
    priceInfo: Object,
    shopInfo: Object,
    skuId: Number,
    skuName: String,
    spuid: Number,
  });
  const cartSchema = new mongoose.Schema({
    id: String,
    userId: String,
    skuId: Number,
    cartPrice: Number,
    skuNum: Number,
    imgUrl: String,
    skuName: String,
    isChecked: Number,
    skuPrice: Number,
    brandName:String
  });

  const adminModel = mongoose.model("admins", adminSchema);
  const bannerModel = mongoose.model("banners", bannerSchema);
  const goodsModel = mongoose.model("goods", goodsSchema);
  const cartModel = mongoose.model("carts", cartSchema);

  /**
   * 批量插入商品信息
   */
  // goodsModel.insertMany(goodsData, (error, data) => {
  //     if(error) throw error
  //     console.log('success to insert data......')
  // })

  /*****************************************************************************/

  // 验证登录信息
  app.post("/login", (request, response) => {
    const { username, password } = request.body;
    adminModel.findOne({ username, password }, (err, data) => {
      if (err) throw err;
      if (data) {
        response.send({ status: 200, id: data.id });
      } else {
        response.send({ status: 404 });
      }
    });
  });

  // 验证注册信息
  app.post("/register", (request, response) => {
    const { id, username, password } = request.body;
    adminModel.findOne({ username }, (err, data) => {
      if (err) throw err;
      //判断，如果数据库中存在相同用户名的数据，返回
      if (data) {
        response.send({ status: 404 });
        return;
      }
      adminModel.create(
        {
          id,
          username,
          password,
        },
        (err, data) => {
          if (err) throw err;
          response.send({ status: 200, id: data.id });
        }
      );
    });
  });

  //获取轮播图地址
  app.get("/banner", (request, response) => {
    bannerModel.find((error, data) => {
      if (error) throw error;
      if (data) {
        response.send({ status: 200, data });
        return;
      }
    });
  });

  /**
   * 接受params参数, 可传可不传, 不传获得所有商品数据
   */
  app.get("/goods/:keyword?", (request, response) => {
    const keyword = request.params.keyword;
    const reg = new RegExp(keyword, "i");
    // 如果传了参数, 则返回按照搜索内容返回相关的数据
    if (keyword) {
      goodsModel.find(
        {
          $or: [
            //多条件，数组
            { brandCode: { $regex: reg } },
            { brandName: { $regex: reg } },
            { skuName: { $regex: reg } },
          ],
        },
        (error, data) => {
          if (error) throw error;
          if (data) {
            response.send({ status: 200, data });
            return;
          }
        }
      );
      // 如果没有传参数, 则返回全部数据,用于首页的全部展示
    } else {
      goodsModel
        .find()
        .sort({ comments: 1 })
        .exec((error, data) => {
          if (error) throw error;
          if (data) {
            response.send({ status: 200, data });
            return;
          }
        });
    }
  });

  // 获取商品详情
  app.get("/detail/:skuId", (request, response) => {
    const skuId = request.params.skuId;
    goodsModel.findOne({ skuId }, (error, data) => {
      if (error) throw error;
      if (data) {
        response.send({ status: 200, data });
        return;
      }
    });
  });

  // 添加至购物车
  /**
   * 参数: params: skuId
   *      请求体参数: userId
   */
  app.post("/cart/addToCart/:skuId", (request, response) => {
    const { skuId } = request.params;
    const { userId } = request.body;
    goodsModel.findOne({ skuId }, (error, data) => {
      if (error) throw error;
      if (data) {
        cartModel.findOne({ userId, skuId }, (error1, data1) => {
          if (error1) throw error1;
          if (data1) {
            cartModel.updateOne(
              { userId, skuId },
              {
                skuNum: data1.skuNum + 1,
                cartPrice: data1.cartPrice + data1.skuPrice,
              },
              (error2, data2) => {
                if (error2) throw error2;
                if (data2) {
                  response.send({ status: 200 });
                  console.log("添加购物车成功");
                }
              }
            );
          } else {
            cartModel.create(
              {
                brandName: data.brandName,
                id: uuid(),
                userId: userId,
                skuId: skuId,
                cartPrice: data.priceInfo.price,
                skuNum: 1,
                imgUrl: data.imageInfo.whiteImage,
                skuName: data.skuName,
                isChecked: 0,
                skuPrice: data.priceInfo.price,
              },
              (error3, data3) => {
                if (error3) throw error3;
                if (data3) {
                  response.send({ status: 200 });
                  console.log("创建购物车成功");
                }
              }
            );
          }
        });
      }
    });
  });

  // 根据token获取购物车数据
  app.get("/getCart", (request, response) => {
    const { token } = request.headers;
    if (token) {
      cartModel.find({userId: token},(err, data) => {
        if (err) throw err;
        if (data) {
          response.send({ status: 200, data });
        }
      });
    }
  });

  //修改购物车单个商品选中状态
  app.get('/checkOneCart/:skuId/:isChecked', (request, response) => {
    const {skuId, isChecked} = request.params
    const { token } = request.headers;
    cartModel.findOne({skuId, userId: token}).updateOne({isChecked}).exec((err, data) => {
      if(err) throw err;
      if(data)
        response.send({status: 200, data: null})
    })
  });

  //修改购物车全部商品选中状态
  app.get('/checkAllCart/:isChecked', (request, response) => {
    const { isChecked } = request.params
    const { token } = request.headers;
    cartModel.find({userId: token}).updateMany({isChecked}).exec((err, data) => {
      if(err) throw err;
      if(data) {
        response.send({status: 200, data: null})
      }
    })
  });

  //添加或减少商品数量
  app.get('/changeSkuNum/:skuId/:skuNum', (request, response) => {
    const {skuId, skuNum} = request.params;
    const {token} = request.headers;
    cartModel.findOne({userId: token, skuId}).exec((err, data) => {
      if(err) throw err;
      if(data) {
        cartModel.findOne({userId: token, skuId}).updateOne({
          skuNum: skuNum,
          cartPrice: data.skuPrice * skuNum
        }, (err, data) => {
          if(err) throw err
          if(data)
          response.send({status: 200, data: null})
        })
        
      }
    })
  });

  //删除单个购物车商品
  app.delete('/deleteOneCart/:skuId', (request, response) => {
    const {skuId} = request.params;
    const {token} = request.headers;
    cartModel.deleteOne({userId: token, skuId}, (err, data) => {
      if(err) throw err;
      if(data) {
        response.send({status: 200, data: null})
      }
    })
  });
});

mongoose.connection.on("error", () => {
  console.log("连接失败");
});

app.listen(5000, () => console.log("服务器已启动"));
