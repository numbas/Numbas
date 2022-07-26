grep ".trigger('\(.*\)'" runtime/scripts/*.js | sed "s/.*.trigger('\([^']*\)'.*/\1/" | sort | uniq > /tmp/defined.txt
grep "^\s*['\"]\(event\|signal\): \([^'\"]*\)" tests/parts/part_tests.js | sed "s/.*: \([^'\"]*\).*/\1/" | sort | uniq > /tmp/tested.txt
grep "@fires .*\(event\|signal\):\(.*\)\s*" runtime/scripts/*.js | sed "s/.*@fires .*://" | sort | uniq > /tmp/documented.txt

echo "Untested events and signals:"
echo "Defined but untested events/signals are on lines starting with <"
echo "Tested but undefined events/signals are on lines starting with >"
diff /tmp/defined.txt /tmp/tested.txt | grep "^[<>]"

echo ""
echo "Undocumented events and signals:"
echo "Defined but undocumented events/signals are on lines starting with <"
echo "Documented but undefined events/signals are on lines starting with >"
diff /tmp/defined.txt /tmp/documented.txt | grep "^[<>]"

rm /tmp/defined.txt
rm /tmp/tested.txt
rm /tmp/documented.txt
