# Hacky script to make Numbas exams.  Mainly for Numbas testing 11th June 2012.
OUTPUT_DIR="output/numbas-testing"
EXAMPLE_DIR="exams/examples"
NORMAL_MODULES="MAS1041 MAS1042 MAS1043 MAS1141 MAS1142 MAS1143 MAS1242 MAS1243 MAS1343"
PAIRED_MODULES="MAS1341 MAS1342"

if [ $# -ne 1 ]; then
  echo ERROR: specify whether you want SCORM output or not with true or false.
  exit 1
fi

SCORM=$1

if [[ $SCORM != true && $SCORM != false ]]; then
  echo ERROR: specify whether you want SCORM output or not with true or false.
  exit 2
fi

function make_dirs() {
  if [ ! -d ${OUTPUT_DIR}/${module} ]; then
    mkdir ${OUTPUT_DIR}/${module}
  fi
}

if [ ! -d ${OUTPUT_DIR} ]; then
  mkdir ${OUTPUT_DIR}
fi

EXTRA_FLAGS=""
for module in $NORMAL_MODULES; do
  make_dirs
  for i in `seq 1 4`; do
    OUTPUT=CBA${i}
    if ${SCORM}; then
      EXTRA_FLAGS="-sz"
      OUTPUT=CBA${i}.zip
    fi
    numbas.py -c ${EXTRA_FLAGS} -o ${OUTPUT_DIR}/${module}/${OUTPUT} -t cheat ${EXAMPLE_DIR}/${module}/CBA${i}/practice.exam
  done
done

for module in $PAIRED_MODULES; do
  make_dirs
  for i in `seq 1 2`; do
    for j in a b; do
      OUTPUT=CBA${i}${j}
      if ${SCORM}; then
        EXTRA_FLAGS="-sz"
        OUTPUT=CBA${i}${j}.zip
      fi
      numbas.py -c ${EXTRA_FLAGS} -o ${OUTPUT_DIR}/${module}/${OUTPUT} -t cheat ${EXAMPLE_DIR}/${module}/CBA${i}${j}/practice.exam
    done
  done
done
