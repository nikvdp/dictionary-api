// This program strips the first 4 characters from each line in the input
#include <stdio.h>

int main() {
  while(!ferror(stdin) && !feof(stdin)) {
    size_t len = 0;
    char *line = fgetln(stdin, &len);
    if (!line) break;

    if (len > 4)
      fwrite(line + 4, 1, len - 4, stdout);
  }

  return 0;
}