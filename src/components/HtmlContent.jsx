import React from 'react'

function toReactAttributeName(name) {
  if (name === 'class') return 'className'
  if (name === 'for') return 'htmlFor'
  if (name.startsWith('aria-') || name.startsWith('data-')) return name
  if (name.includes('-')) {
    return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
  }
  return name
}

function nodeToReact(node, key) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const props = { key }

  for (const attr of Array.from(node.attributes)) {
    const attrName = toReactAttributeName(attr.name)
    props[attrName] = attr.value === '' ? true : attr.value
  }

  const children = Array.from(node.childNodes)
    .map((child, childIndex) => nodeToReact(child, `${key}.${childIndex}`))
    .filter((child) => child !== null && child !== undefined)

  return React.createElement(node.tagName.toLowerCase(), props, ...children)
}

export default function HtmlContent({ html }) {
  if (!html) {
    return null
  }

  const documentFragment = new DOMParser().parseFromString(`<template>${html}</template>`, 'text/html')
  const template = documentFragment.querySelector('template')
  const nodes = template ? Array.from(template.content.childNodes) : []

  return (
    <>
      {nodes.map((node, index) => nodeToReact(node, index)).filter((child) => child !== null && child !== undefined)}
    </>
  )
}