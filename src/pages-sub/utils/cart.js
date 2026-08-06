/**
 * 购物车本地状态管理 (uni storage 持久化)
 * 多端通用: H5 / 小程序 / App
 */

const KEY = 'dy_cart'

export function getCart() {
  try {
    return uni.getStorageSync(KEY) || []
  } catch {
    return []
  }
}

function saveCart(list) {
  uni.setStorageSync(KEY, list)
}

export function addToCart(product, qty = 1) {
  const list = getCart()
  const found = list.find((i) => i.id === product.id)
  if (found) {
    found.qty += qty
    found.selected = true
  } else {
    list.unshift({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      attrs: product.attrs || {},
      qty,
      selected: true,
    })
  }
  saveCart(list)
  return list
}

export function updateQty(id, qty) {
  const list = getCart()
  const item = list.find((i) => i.id === id)
  if (item) {
    item.qty = Math.max(1, qty)
    saveCart(list)
  }
  return list
}

export function toggleSelect(id) {
  const list = getCart()
  const item = list.find((i) => i.id === id)
  if (item) {
    item.selected = !item.selected
    saveCart(list)
  }
  return list
}

export function toggleAll(selected) {
  const list = getCart()
  list.forEach((i) => (i.selected = selected))
  saveCart(list)
  return list
}

export function removeFromCart(ids) {
  const list = getCart().filter((i) => !ids.includes(i.id))
  saveCart(list)
  return list
}

export function removeByIds(ids) {
  return removeFromCart(ids)
}

export function getSelectedItems() {
  const list = getCart()
  const items = list.filter((i) => i.selected)
  const total = items.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0)
  return { items, total: total.toFixed(2), count: items.reduce((s, i) => s + i.qty, 0) }
}

export function clearSelected() {
  const list = getCart().filter((i) => !i.selected)
  saveCart(list)
  return list
}

export function isAllSelected() {
  const list = getCart()
  return list.length > 0 && list.every((i) => i.selected)
}
