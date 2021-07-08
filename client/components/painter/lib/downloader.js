/**
 * LRU 文件存储，使用该 downloader 可以让下载的文件存储在本地，下次进入小程序后可以直接使用
 * 详细设计文档可查看 https://juejin.im/post/5b42d3ede51d4519277b6ce3
 */
import util from './util';
// const util = require('./util');

const SAVED_FILES_KEY = 'savedFiles';
const KEY_TOTAL_SIZE = 'totalSize';
const KEY_PATH = 'path';
const KEY_TIME = 'time';
const KEY_SIZE = 'size';

// 可存储总共为 6M，目前小程序可允许的最大本地存储为 10M
let MAX_SPACE_IN_B = 6 * 1024 * 1024;
let savedFiles = {};

export default class Dowloader {
  constructor() {
    // eslint-disable-next-line no-undef
    const app = getApp();
    if (app.PAINTER_MAX_LRU_SPACE) {
      MAX_SPACE_IN_B = app.PAINTER_MAX_LRU_SPACE;
    }
    my.getStorage({
      key: SAVED_FILES_KEY,
      success(res) {
        if (res.data) {
          savedFiles = res.data;
        }
      },
    });
  }

  /**
   * 下载文件，会用 lru 方式来缓存文件到本地
   * @param {String} url 文件的 url
   */
  download(url) {
    return new Promise((resolve, reject) => {
      if (!(url && util.isValidUrl(url))) {
        resolve(url);
        return;
      }
      const file = getFile(url);
      if (file) {
        // 检查文件是否正常，不正常需要重新下载
        my.getSavedFileInfo({
          apFilePath: file[KEY_PATH],
          success: () => {
            resolve(file[KEY_PATH]);
          },
          fail: () => {
            downloadFile(url).then((path) => {
              resolve(path);
            }, () => {
              reject();
            });
          },
        });
      } else {
        downloadFile(url).then((path) => {
          resolve(path);
        }, () => {
          reject();
        });
      }
    });
  }
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    my.downloadFile({
      url,
      success(res) {
        if (!res.apFilePath) {
          reject();
          return;
        }
        const { apFilePath } = res;
        my.getFileInfo({
          apFilePath,
          success: (tmpRes) => {
            const newFileSize = tmpRes.size;
            doLru(newFileSize).then(() => {
              saveFile(url, newFileSize, apFilePath).then((filePath) => {
                resolve(filePath);
              });
            }, () => {
              resolve(apFilePath);
            });
          },
          fail: () => {
          // 文件大小信息获取失败，则此文件也不要进行存储
            resolve(res.apFilePath);
          },
        });
      },
      fail(error) {
        console.error(`downloadFile failed, ${JSON.stringify(error)} `);
        reject();
      },
    });
  });
}

function saveFile(key, newFileSize, apFilePath) {
  return new Promise((resolve) => {
    my.saveFile({
      apFilePath,
      success: (fileRes) => {
        const totalSize = savedFiles[KEY_TOTAL_SIZE] ? savedFiles[KEY_TOTAL_SIZE] : 0;
        savedFiles[key] = {};
        savedFiles[key][KEY_PATH] = fileRes.apFilePath;
        savedFiles[key][KEY_TIME] = new Date().getTime();
        savedFiles[key][KEY_SIZE] = newFileSize;
        savedFiles.totalSize = newFileSize + totalSize;
        my.setStorage({
          key: SAVED_FILES_KEY,
          data: savedFiles,
        });
        resolve(fileRes.apFilePath);
      },
      fail: (r) => {
        console.error(`saveFile ${key} failed, then we delete all files`);
        // 由于 saveFile 成功后，res.tempFilePath 处的文件会被移除，所以在存储未成功时，我们还是继续使用临时文件
        resolve(apFilePath);
        // 如果出现错误，就直接情况本地的所有文件，因为你不知道是不是因为哪次lru的某个文件未删除成功
        reset();
      },
    });
  });
}

/**
 * 清空所有下载相关内容
 */
function reset() {
  my.removeStorage({
    key: SAVED_FILES_KEY,
    success: () => {
      my.getSavedFileList({
        success: (listRes) => {
          removeFiles(listRes.fileList);
        },
        fail: () => {
          console.error('getSavedFileList failed');
        },
      });
    },
  });
}

function doLru(size) {
  return new Promise((resolve, reject) => {
    let totalSize = savedFiles[KEY_TOTAL_SIZE] ? savedFiles[KEY_TOTAL_SIZE] : 0;

    if (size + totalSize <= MAX_SPACE_IN_B) {
      resolve();
      return;
    }
    // 如果加上新文件后大小超过最大限制，则进行 lru
    const pathsShouldDelete = [];
    // 按照最后一次的访问时间，从小到大排序
    const allFiles = JSON.parse(JSON.stringify(savedFiles));
    delete allFiles[KEY_TOTAL_SIZE];
    const sortedKeys = Object.keys(allFiles).sort((a, b) => {
      return allFiles[a][KEY_TIME] - allFiles[b][KEY_TIME];
    });

    for (const sortedKey of sortedKeys) {
      totalSize -= savedFiles[sortedKey].size;
      pathsShouldDelete.push(savedFiles[sortedKey][KEY_PATH]);
      delete savedFiles[sortedKey];
      if (totalSize + size < MAX_SPACE_IN_B) {
        break;
      }
    }

    savedFiles.totalSize = totalSize;

    my.setStorage({
      key: SAVED_FILES_KEY,
      data: savedFiles,
      success: () => {
      // 保证 storage 中不会存在不存在的文件数据
        if (pathsShouldDelete.length > 0) {
          removeFiles(pathsShouldDelete);
        }
        resolve();
      },
      fail: () => {
        console.error('doLru setStorage failed');
        reject();
      },
    });
  });
}

function removeFiles(pathsShouldDelete) {
  for (const pathDel of pathsShouldDelete) {
    let delPath = pathDel;
    if (typeof pathDel === 'object') {
      delPath = pathDel.filePath;
    }
    my.removeSavedFile({
      apFilePath: delPath,
      fail: () => {
        console.error(`removeSavedFile ${pathDel} failed`);
      },
    });
  }
}

function getFile(key) {
  if (!savedFiles[key]) {
    return;
  }
  savedFiles[key].time = new Date().getTime();
  my.setStorage({
    key: SAVED_FILES_KEY,
    data: savedFiles,
  });
  return savedFiles[key];
}
