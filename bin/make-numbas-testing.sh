# Hacky script to make Numbas exams.  Mainly for Numbas testing 11th June 2012.
OUTPUT_DIR="output/numbas-testing"
EXAMPLE_DIR="exams/examples"
NORMAL_MODULES="MAS1041 MAS1042 MAS1043 MAS1141 MAS1142 MAS1143 MAS1242 MAS1243 MAS1343"
PAIRED_MODULES="MAS1341 MAS1342"

function make_dirs() {
  if [ ! -d ${OUTPUT_DIR}/${module} ]; then
    mkdir ${OUTPUT_DIR}/${module}
  fi
}

for module in $NORMAL_MODULES; do
  make_dirs
  for i in `seq 1 4`; do
    numbas.py -c -o ${OUTPUT_DIR}/${module}/CBA${i} -t cheat ${EXAMPLE_DIR}/${module}/CBA${i}/practice.exam
  done
done

for module in $PAIRED_MODULES; do
  make_dirs
  for i in `seq 1 2`; do
    for j in a b; do
      numbas.py -c -o ${OUTPUT_DIR}/${module}/CBA${i}${j} -t cheat ${EXAMPLE_DIR}/${module}/CBA${i}${j}/practice.exam
    done
  done
done
