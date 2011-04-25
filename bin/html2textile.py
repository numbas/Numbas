#!/usr/bin/env python

import sgmllib, string
import re


whitespace_re = re.compile("\s+")


def normalise_space(s):
    """Normalise space in the same manner as HTML. Any substring of multiple
    whitespace characters will be replaced with a single space char.
    
    """
    return whitespace_re.sub(" ", str(s))


def make_block_start_end_pair(tag):
    def start_t(self, attrs):
        self._write("%s. " % tag)
        self._start_capture(tag)
    def end_t(self):
        self._stop_capture_and_write()
        self._write("\n\n")
    return start_t, end_t


def make_quicktag_start_end_pair(tag, wrapchar):
    def start_t(self, attrs):
        self._write([" ", wrapchar])
        self._start_capture(tag)
    def end_t(self):
        self._stop_capture_and_write()
        self._write([wrapchar, " "])
    return start_t, end_t


class HtmlToTextileConvertingParser(sgmllib.SGMLParser):
    """An SGML parser class which traverses the tree and converts HTML tags into
    Textile markup. Block tags within block tags are ignored.
    
    """
    valid_tags = ()
    valid_attrs = ()
    block_tags = ("h1", "h2", "h3", "h4", "h5", "h6", "h7", "p", "bq")

    from htmlentitydefs import entitydefs
    
    def __init__(self):
        sgmllib.SGMLParser.__init__(self)
        self._result = []
        self._data_stack = []
        self._in_block = self._in_ul = self._in_ol = False
        
    def handle_data(self, data):
        if data:
            self._write(normalise_space(data).strip())

    def handle_charref(self, tag):
        self._write(unichr(int(tag)))
        
    def handle_entityref(self, tag):
        if self.entitydefs.has_key(tag): 
            self._write(self.entitydefs[tag])
    
    def handle_starttag(self, tag, method, attrs):
        method(dict(attrs))

    def _write(self, d):
        if len(self._data_stack) < 2:
            target = self._result
        else:
            target = self._data_stack[-1]
        if type(d) in (list, tuple):
            target += d
        else:
            target.append(str(d))

    def _start_capture(self, tag):
        self._in_block = tag
        self._data_stack.append([])

    def _stop_capture_and_write(self):
        self._in_block = False
        self._write(self._data_stack.pop())
        
    start_h1, end_h1 = make_block_start_end_pair("h1")
    start_h2, end_h2 = make_block_start_end_pair("h2")
    start_h3, end_h3 = make_block_start_end_pair("h3")
    start_h4, end_h4 = make_block_start_end_pair("h4")
    start_h5, end_h5 = make_block_start_end_pair("h5")
    start_h6, end_h6 = make_block_start_end_pair("h6")
    start_h7, end_h7 = make_block_start_end_pair("h7")
    start_p, end_p = make_block_start_end_pair("p")
    start_blockquote, end_blockquote = make_block_start_end_pair("bq")

    start_b, end_b = make_quicktag_start_end_pair("b", "*")
    start_strong, end_strong = make_quicktag_start_end_pair("strong", "*")
    start_i, end_i = make_quicktag_start_end_pair("i", "_")
    start_em, end_em = make_quicktag_start_end_pair("em", "_")
    start_cite, end_cite = make_quicktag_start_end_pair("cite", "??")
    start_s, end_s = make_quicktag_start_end_pair("s", "-")
    start_sup, end_sup = make_quicktag_start_end_pair("sup", "^")
    start_sub, end_sub = make_quicktag_start_end_pair("sub", "~")

    def start_p(self, attrs):
        self._start_capture("p")

    def end_p(self):
        self._stop_capture_and_write()
        self._write("\n\n")

    def start_ol(self, attrs):
        self._in_ol = True

    def end_ol(self):
        self._in_ol = False
        self._write("\n")

    def start_ul(self, attrs):
        self._in_ul = True

    def end_ul(self):
        self._in_ul = False
        self._write("\n")

    def start_li(self, attrs):
        if self._in_ol:
            self._write("# ")
        else:
            self._write("* ")
        self._start_capture("li")

    def end_li(self):
        self._stop_capture_and_write()
        self._write("\n")

    def start_a(self, attrs):
        self.a_href = attrs.get("href")
        if self.a_href:
            self._write(" \"")
            self._start_capture("a")

    def end_a(self):
        if self.a_href:
            self._stop_capture_and_write()
            self._write(["\":", self.a_href, " "])
            self.a_href = False

    def start_img(self, attrs):
        if attrs.get("src"):
            self._write([" !", attrs["src"], "! "])

    def end_img(self):
        pass

    def start_tr(self, attrs):
        pass

    def end_tr(self):
        self._write("|\n")

    def start_td(self, attrs):
        self._write("|")
        self._start_capture("td")

    def end_td(self):
        self._stop_capture_and_write()
        self._write("|")

    def start_br(self, attrs):
        self._write("\n")

    def unknown_starttag(self, tag, attrs):
        """Delete all other tags except for those specified in valid_tags"""
        if tag in self.valid_tags:       
            self._write(["<", tag])
            for k, v in attrs:
                if k in self.valid_attrs:
                    self._write([" ", k, "=\"", v, "\""])
            self._write(">")
                
    def unknown_endtag(self, tag):
        if tag in self.valid_tags:
            self._write(["</", tag, ">"])

    def _get_result(self):
        return "".join(self._result).strip()

    result = property(_get_result)
        

def html2textile(s):
    """Convert a snippet of HTML to Textile, a simple markup language. See
    http://www.textism.com/tools/textile/ for Textile's rules.
    
    >>> html2textile("<h1>Hello world!</h1>")
    'h1. Hello world!'

    >>> html2textile("<h1>Hello <strong>world</strong>!</h1>")
    'h1. Hello *world*!'

    >>> html2textile('<h1>Hello <a href="http://www.google.com/">world</a>!</h1>')
    'h1. Hello "world":http://www.google.com/!'

    >>> html2textile('<img src="http://www.google.com/intl/en/images/logo.gif" \
    ...     width="276" height="110" alt="Google logo">')
    '!http://www.google.com/intl/en/images/logo.gif!'
    
    >>> html2textile('<h1>Hello world!</h1><p>Welcome to my home page.</p>')
    'h1. Hello world!\\n\\np. Welcome to my home page.'
    """
    parser = HtmlToTextileConvertingParser()
    parser.feed(s)
    parser.close()
    return parser.result


if __name__ == "__main__":
    import doctest
    doctest.testmod()
