"""Turn the int8 (dynamically quantized) Kokoro ONNX back into a float model.

Only for measuring: real users download the official fp32 model, but this test machine could only
get the int8 copy. Rewrites  DynamicQuantizeLinear -> MatMulInteger/ConvInteger -> (+bias) -> Cast -> Mul
into a plain float MatMul / Conv.   python eval/tools/dequantize_kokoro.py in.onnx out.onnx
"""
import sys

import numpy as np
import onnx
from onnx import helper, numpy_helper


def main(src: str, dst: str) -> None:
    m = onnx.load(src)
    g = m.graph
    inits = {i.name: i for i in g.initializer}
    prod = {o: n for n in g.node for o in n.output}
    cons: dict[str, list] = {}
    for n in g.node:
        for i in n.input:
            cons.setdefault(i, []).append(n)
    arr = lambda name: numpy_helper.to_array(inits[name])  # noqa: E731
    drop, add, new_inits, done = set(), [], [], 0

    def only(name, op):
        c = cons.get(name, [])
        return c[0] if len(c) == 1 and c[0].op_type == op else None

    for n in list(g.node):
        if n.op_type not in ("MatMulInteger", "ConvInteger"):
            continue
        dql = prod.get(n.input[0])
        if dql is None or dql.op_type != "DynamicQuantizeLinear" or n.input[1] not in inits:
            continue
        a_f = dql.input[0]
        bias, first = None, n.output[0]
        nxt = cons.get(first, [None])[0]
        if nxt is not None and nxt.op_type == "Add":  # quantized bias: Reshape(Cast(Floor(Div(bias, scale))))
            r = prod.get(nxt.input[1])
            c = prod.get(r.input[0]) if r else None
            f = prod.get(c.input[0]) if c else None
            d = prod.get(f.input[0]) if f else None
            if not (d and d.op_type == "Div" and d.input[0] in inits):
                continue
            bias, first = d.input[0], nxt.output[0]
        cast = only(first, "Cast")
        mul = only(cast.output[0], "Mul") if cast else None
        smul = prod.get(mul.input[1]) if mul else None
        if not (smul and smul.op_type == "Mul" and smul.input[1] in inits and n.input[3] in inits):
            continue
        w = arr(n.input[1]).astype(np.float32)
        zp = arr(n.input[3]).astype(np.float32)
        sc = arr(smul.input[1]).astype(np.float32)
        if n.op_type == "MatMulInteger":
            w_f = (w - zp) * sc  # per output column broadcasts on the last axis
            node = helper.make_node("MatMul", [a_f, n.input[1] + "_f32"], [mul.output[0]])
        else:
            shape = (-1,) + (1,) * (w.ndim - 1)
            w_f = (w - zp.reshape(shape if zp.ndim else ())) * sc.reshape(shape if sc.ndim else ())
            ins = [a_f, n.input[1] + "_f32"] + ([bias] if bias else [])
            node = helper.make_node("Conv", ins, [mul.output[0]], name=n.name + "_f32")
            node.attribute.extend(n.attribute)
        if all(i.name != n.input[1] + "_f32" for i in new_inits):  # weights can be shared by several ops
            new_inits.append(numpy_helper.from_array(w_f.astype(np.float32), n.input[1] + "_f32"))
        add.append((n, node))
        drop.update({id(n), id(cast), id(mul)} | ({id(nxt)} if bias else set()))
        done += 1

    order = []
    for n in g.node:  # keep topological order: put each float op where its int op was
        rep = next((new for old, new in add if old is n), None)
        if rep is not None:
            order.append(rep)
        elif id(n) not in drop:
            order.append(n)
    outputs = {o.name for o in g.output}
    while True:  # remove nodes nothing uses any more (quantize/scale helpers)
        used = {i for n in order for i in n.input} | outputs
        keep = [n for n in order if any(o in used for o in n.output)]
        if len(keep) == len(order):
            break
        order = keep
    del g.node[:]
    g.node.extend(order)
    used = {i for n in order for i in n.input}
    kept = [i for i in g.initializer if i.name in used] + [i for i in new_inits if i.name in used]
    del g.initializer[:]
    g.initializer.extend(kept)
    onnx.save(m, dst)
    left = sum(1 for n in order if n.op_type in ("MatMulInteger", "ConvInteger"))
    print(f"converted {done} ops, {left} integer ops left -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
