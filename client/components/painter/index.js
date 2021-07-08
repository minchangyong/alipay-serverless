import Pen from './lib/pen';
import Downloader from './lib/downloader';
import util from './lib/util';

const downloader = new Downloader();
// 最大尝试的绘制次数
const MAX_PAINT_COUNT = 5;
let screenK = 0.5;
Component({
  props: {
    customStyle: {}, // 自定义样式
    palette: {}, // 数据
    dirty: false, // 启用脏检查，默认 false
    // eslint-disable-next-line no-empty-pattern
    onError: () => { },
    // eslint-disable-next-line no-empty-pattern
    onSuccess: () => { },
  },
  data: {
    picURL: '',
    showCanvas: true,
    painterStyle: '',
    canvasWidthInPx: 0,
    canvasHeightInPx: 0,
    paintCount: 0,
  },
  didMount() {
    setStringPrototype();
    setTimeout(() => {
      this.data.paintCount = 0;
      this.startPaint();
    }, 500);
  },
  methods: {
    /**
     * 判断一个 object 是否为 空
     * @param {object} object
     */
    isEmpty(object) {
      return !Object.keys(object).length;
    },

    isNeedRefresh(newVal, oldVal) {
      return !(!newVal || this.isEmpty(newVal) || (this.props.dirty && util.equal(newVal, oldVal)));
    },

    startPaint() {
      if (this.isEmpty(this.props.palette)) {
        return;
      }
      // eslint-disable-next-line no-undef
      const app = getApp();
      if (!(app.systemInfo && app.systemInfo.windowWidth)) {
        try {
          app.systemInfo = my.getSystemInfoSync();
        } catch (e) {
          const error = `Painter get system info failed, ${JSON.stringify(e)}`;
          this.props.onError({
            error,
          });
          console.error(error);
          return;
        }
      }
      screenK = app.systemInfo.windowWidth / 750;
      this.downloadImages().then((palette) => {
        const { width, height } = palette;
        this.data.canvasWidthInPx = width.toPx(false);
        this.data.canvasHeightInPx = height.toPx(false);
        if (!width || !height) {
          console.error(`You should set width and height correctly for painter, width: ${width}, height: ${height}`);
          return;
        }
        this.setData({
          painterStyle: `width:${width.toPx(false)};height:${height.toPx(false)};position: absolute; left: -9999rpx;`,
        });
        const ctx = my.createCanvasContext('adcCanvas');
        const pen = new Pen(ctx, palette);
        pen.paint(() => {
          this.saveImgToLocal(ctx);
        });
      });
    },

    downloadImages() {
      return new Promise((resolve) => {
        let preCount = 0;
        let completeCount = 0;
        const paletteCopy = JSON.parse(JSON.stringify(this.props.palette));
        if (paletteCopy.background) {
          preCount++;
          downloader.download(paletteCopy.background).then((path) => {
            paletteCopy.background = path;
            completeCount++;
            if (preCount === completeCount) {
              resolve(paletteCopy);
            }
          }, () => {
            completeCount++;
            if (preCount === completeCount) {
              resolve(paletteCopy);
            }
          });
        }
        if (paletteCopy.views) {
          for (const view of paletteCopy.views) {
            if (view && view.type === 'image' && view.url) {
              preCount++;
              /* eslint-disable no-loop-func */
              downloader.download(view.url).then((path) => {
                view.url = path;
                my.getImageInfo({
                  src: view.url,
                  success: (res) => {
                    // 获得一下图片信息，供后续裁减使用
                    view.sWidth = res.width;
                    view.sHeight = res.height;
                  },
                  fail: () => {
                    // 如果图片坏了，则直接置空，防止坑爹的 canvas 画崩溃了
                    view.url = '';
                    // console.error(`getImageInfo ${view.url} failed, ${JSON.stringify(error)}`);
                  },
                  complete: () => {
                    completeCount++;
                    if (preCount === completeCount) {
                      resolve(paletteCopy);
                    }
                  },
                });
              }, () => {
                completeCount++;
                if (preCount === completeCount) {
                  resolve(paletteCopy);
                }
              });
            }
          }
        }
        if (preCount === 0) {
          resolve(paletteCopy);
        }
      });
    },

    saveImgToLocal(ctx) {
      setTimeout(() => {
        ctx.toTempFilePath({
          success: (res) => {
            this.getImageInfo(res.apFilePath);
          },
        });
      }, 300);
    },

    getImageInfo(filePath) {
      if (!filePath) {
        return;
      }
      my.getImageInfo({
        src: filePath,
        success: (infoRes) => {
          if (this.data.paintCount > MAX_PAINT_COUNT) {
            const error = `The result is always fault, even we tried ${MAX_PAINT_COUNT} times`;
            console.error(error);
            this.props.onError({
              error,
            });
            return;
          }
          // 比例相符时才证明绘制成功，否则进行强制重绘制
          if (Math.abs((infoRes.width * this.data.canvasHeightInPx - this.data.canvasWidthInPx * infoRes.height) / (infoRes.height * this.data.canvasHeightInPx)) < 0.01) {
            this.props.onSuccess({
              path: filePath,
            });
          } else {
            this.startPaint();
          }
          this.data.paintCount++;
        },
        fail: () => {
          // console.error(`getImageInfo failed, ${JSON.stringify(error)}`);
          this.props.onError({
            error: '图片生成失败',
          });
        },
      });
    }
  }
})
function setStringPrototype() {
  // eslint-disable-next-line no-extend-native
  String.prototype.toPx = function toPx(minus) {
    let reg;
    if (minus) {
      reg = /^-?[0-9]+([.][0-9]+)?(rpx|px)$/g;
    } else {
      reg = /^[0-9]+([.][0-9]+)?(rpx|px)$/g;
    }
    const results = reg.exec(this);
    if (!this || !results) {
      console.error(`The size: ${this} is illegal`);
      return 0;
    }
    const unit = results[2];
    const value = parseFloat(this.toString());

    let res = 0;
    if (unit === 'rpx') {
      res = Math.round(value * screenK * (getApp().systemInfo.pixelRatio || 3));
    } else if (unit === 'px') {
      res = value * (getApp().systemInfo.pixelRatio || 3);
    }
    return res;
  };
}
