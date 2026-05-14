const BLOCK_OPEN_RE = /^::([a-zA-Z][\w-]*)(?:\.([a-zA-Z][\w-]*))?(?:\[(.*)\])?\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const DOC_RE = /^@doc\s+"([^"]+)"\s*\{\s*$/;

export function parseVmd(source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const ast = {
    type: "document",
    doc: {
      title: "Untitled VMD",
      attrs: {}
    },
    children: []
  };

  const stack = [ast];

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();

    if (!trimmed) {
      continue;
    }

    const docMatch = trimmed.match(DOC_RE);
    if (docMatch) {
      const { attrs, endIndex } = parseDocAttrs(lines, index + 1);
      ast.doc = {
        title: docMatch[1],
        attrs
      };
      index = endIndex;
      continue;
    }

    if (trimmed === "::") {
      if (stack.length === 1) {
        throw new Error(`Unexpected block close at line ${index + 1}`);
      }
      stack.pop();
      continue;
    }

    const blockMatch = trimmed.match(BLOCK_OPEN_RE);
    if (blockMatch) {
      const [, rawType, variant, attrSource] = blockMatch;
      const node = {
        type: variant ? `${rawType}.${variant}` : rawType,
        tag: rawType,
        variant: variant || null,
        attrs: parseInlineAttrs(attrSource || ""),
        lines: [],
        children: [],
        line: index + 1
      };
      appendNode(stack[stack.length - 1], node);
      stack.push(node);
      continue;
    }

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      appendNode(stack[stack.length - 1], {
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
        line: index + 1
      });
      continue;
    }

    appendLine(stack[stack.length - 1], raw);
  }

  if (stack.length > 1) {
    const openNode = stack[stack.length - 1];
    throw new Error(`Unclosed block "${openNode.type}" opened at line ${openNode.line}`);
  }

  return ast;
}

function parseDocAttrs(lines, startIndex) {
  const attrs = {};

  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed === "}") {
      return { attrs, endIndex: index };
    }
    parseKeyValue(trimmed, attrs);
  }

  throw new Error("Unclosed @doc block");
}

function parseInlineAttrs(source) {
  const attrs = {};
  const attrRe = /([a-zA-Z][\w-]*)\s*=\s*"([^"]*)"/g;
  let match = attrRe.exec(source);
  while (match) {
    attrs[match[1]] = match[2];
    match = attrRe.exec(source);
  }
  return attrs;
}

function parseKeyValue(line, target) {
  const cleaned = line.replace(/[;,]\s*$/, "");
  const match = cleaned.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
  if (!match) {
    return;
  }
  target[match[1]] = stripQuotes(match[2].trim());
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function appendNode(parent, node) {
  if (!parent.children) {
    parent.children = [];
  }
  parent.children.push(node);
}

function appendLine(parent, raw) {
  if (!parent.lines) {
    parent.lines = [];
  }
  parent.lines.push(raw.trim());
}
