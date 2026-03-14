
const utils = {


  // 相对位置计算函数
  calculateRelativePosition(relativePosition, targetObj, newObjSize) {
    if (!targetObj || !relativePosition) return null;

    const { direction, offset = 10 } = relativePosition;
    const targetCenterX = targetObj.x + targetObj.width / 2;
    const targetCenterY = targetObj.y + targetObj.height / 2;
    const targetRight = targetObj.x + targetObj.width;
    const targetBottom = targetObj.y + targetObj.height;

    let x, y;

    switch (direction) {
      case 'left':
        x = targetObj.x - newObjSize.width - offset;
        y = targetCenterY - newObjSize.height / 2;
        break;
      case 'right':
        x = targetRight + offset;
        y = targetCenterY - newObjSize.height / 2;
        break;
      case 'top':
        x = targetCenterX - newObjSize.width / 2;
        y = targetObj.y - newObjSize.height - offset;
        break;
      case 'bottom':
        x = targetCenterX - newObjSize.width / 2;
        y = targetBottom + offset;
        break;
      case 'top-left':
        x = targetObj.x - newObjSize.width - offset;
        y = targetObj.y - newObjSize.height - offset;
        break;
      case 'top-right':
        x = targetRight + offset;
        y = targetObj.y - newObjSize.height - offset;
        break;
      case 'bottom-left':
        x = targetObj.x - newObjSize.width - offset;
        y = targetBottom + offset;
        break;
      case 'bottom-right':
        x = targetRight + offset;
        y = targetBottom + offset;
        break;
      case 'center':
        x = targetCenterX - newObjSize.width / 2;
        y = targetCenterY - newObjSize.height / 2;
        break;
      case 'inside':
        // 在目标物体内部居中
        x = targetObj.x + (targetObj.width - newObjSize.width) / 2;
        y = targetObj.y + (targetObj.height - newObjSize.height) / 2;
        break;
      case 'outside':
        // 默认放在右侧
        x = targetRight + offset;
        y = targetCenterY - newObjSize.height / 2;
        break;
      default:
        return null;
    }

    // 确保坐标在画布范围内
    return {
      x: Math.max(0, Math.min(750, x)),
      y: Math.max(0, Math.min(550, y))
    };
  },


  // 颜色格式校验函数
  validateColor(color) {
    // 检查是否为有效的十六进制颜色
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexColorRegex.test(color)) {
      return color;
    }
    // 如果不是有效的十六进制颜色，返回默认颜色
    return '#3862f6';
  },


  // 检测两个物体是否碰撞
  isColliding(obj1, obj2) {
    obj1.setCoords();
    obj2.setCoords();
    return obj1.intersectsWithObject(obj2);
  },


}


export default utils;

