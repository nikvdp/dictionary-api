#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "zlib.h"

#define CHUNK 16384

/*
 40 Length of the zlib stream
 4c 0020
 54 0275 number of blocks

 60 808c pointer to the next block
 64 8088 length of the first block
 68 047a4a length of the unpacked block
 6c start of the zlib stream

 80fc second block

 13cd134
 13cd174
*/

int unpack(unsigned char *in, int len)
{
  int ret,outed=0;
  unsigned have;
  z_stream strm;
  unsigned char out[CHUNK];

  strm.zalloc = Z_NULL;
  strm.zfree = Z_NULL;
  strm.opaque = Z_NULL;
  strm.avail_in = 0;
  strm.next_in = Z_NULL;
  ret = inflateInit(&strm);
  if (ret != Z_OK)
    return ret;
  strm.avail_in = len;
  strm.next_in = in;
  do {
    strm.avail_out = CHUNK;
    strm.next_out = out;
    ret = inflate(&strm, Z_NO_FLUSH);
    assert(ret != Z_STREAM_ERROR);  /* state not clobbered */
    switch (ret) {
      case Z_NEED_DICT:
        ret = Z_DATA_ERROR;     /* and fall through */
      case Z_DATA_ERROR:
      case Z_MEM_ERROR:
        (void)inflateEnd(&strm);
        return ret;
    }
//    printf("%lx %x\n",strm.next_in-in,strm.avail_in);
    have = CHUNK - strm.avail_out /* - (outed?0:4)*/;

    int off = 0;
    /*
    while (have - off > 3 && out[off] != '<' && out[1+off] != 'd' && out[2+off] != ':') {
      ++off;
    }*/

    if (have - off <= 3) {
      fprintf(stderr, "could not find entry\n");
    }

    if (fwrite(out + off/*+(outed?0:4)*/, have - off, 1, stdout) != 1 || ferror(stdout)) {
      (void)inflateEnd(&strm);
      return Z_ERRNO;
    }
    //exit(0);

    outed+=have;
  } while (strm.avail_out == 0);
  printf("%06x\n",outed);
  (void)inflateEnd(&strm);
  return ret == Z_STREAM_END ? Z_OK : Z_DATA_ERROR;
}

char filename[256];

int main(int argc,char **argv) {
  FILE *fin; int limit,blen=0,p,l,bcnt=0; unsigned char *buf=NULL;
  assert(argc >= 2);
  sprintf(filename,"%s/Contents/Resources/Body.data",argv[1]);
  if((fin=fopen(filename,"rb"))) {
    fseek(fin,0x40,SEEK_SET);
    fread(&l,1,4,fin);
    limit=0x40+l;
    p=0x60;
    do {
      fseek(fin,p,SEEK_SET);
      fread(&l,1,4,fin);
//      if(0==l) break;
      if(blen<l) {
        if(buf!=NULL) free(buf);
        blen=l;
        buf=(unsigned char *)malloc(blen);
      }
      fread(buf,1,l,fin);
      //fprintf(stderr, "%x@%06x: %x>%06x\n",bcnt,p,l,((int *)buf)[1]);
      unpack(buf+8,l-8);
      p+=4+l;
      ++bcnt;
    } while(p<limit);
    free(buf);
    fclose(fin);
  }
  return 0;
}
