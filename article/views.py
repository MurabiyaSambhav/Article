from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.urls import reverse
from django.core.paginator import Paginator
from collections import Counter
from django.db.models import Count, Q, Exists, OuterRef, F
from article.models import Cuser, Articles, Comment, Like
from rest_framework.response import Response
from article.serializers import ArticleSerializer
from rest_framework import viewsets, filters
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny

import json

# Your existing API viewset remains the same.
class ArticleHybridViewSet(viewsets.ModelViewSet):
    queryset = Articles.objects.filter(is_draft=False).select_related('author').order_by('-created_at')
    serializer_class = ArticleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'search_articles']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='search')
    @permission_classes([AllowAny])
    def search_articles(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        tag_query = request.query_params.get('tag', '').strip()

        if tag_query:
            queryset = queryset.filter(tags__icontains=tag_query)
        
        paginator = Paginator(queryset, 5)
        page_number = request.query_params.get('page', 1)
        page_obj = paginator.get_page(page_number)
        
        serializer = self.get_serializer(page_obj, many=True)
        return Response({
            'articles': serializer.data,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
        })

# -------------------- Traditional Views (Modified for SSR) --------------------
# ------------------------------- Register ----------------------------------
def register(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            password = data.get('password')
            phone = data.get('phone')

            if Cuser.objects.filter(email=email).exists():
                return JsonResponse({"success": False, "message": "Email already registered!"}, status=409)
            if Cuser.objects.filter(username=name).exists():
                return JsonResponse({"success": False, "message": "Username already taken!"}, status=409)

            user = Cuser(username=name, email=email, phone=phone)
            user.set_password(password)
            user.save()
            
            return JsonResponse({"success": True, "message": "Registration successful!", "redirect": reverse("login")})
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
    return render(request, 'register.html')

# ------------------------------- Login ----------------------------------

def login(request):
    if request.user.is_authenticated:
        return redirect(reverse('article'))

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            try:
                user = Cuser.objects.get(email=email)
                if user.check_password(password):
                    auth_login(request, user)
                    return JsonResponse({"success": True, "message": "Login successful!", "redirect": reverse('article')})
                else:
                    return JsonResponse({"success": False, "message": "Invalid email or password."}, status=401)
            except Cuser.DoesNotExist:
                return JsonResponse({"success": False, "message": "Invalid email or password."}, status=401)
            
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
    return render(request, 'login.html')

# ------------------------------- Logout ----------------------------------

def logout(request):
    auth_logout(request)
    return redirect(reverse('article'))

# ------------------------------- Articles ----------------------------------

def article(request):
    user = request.user if request.user.is_authenticated else None
    
    # Get the search query from the GET parameters
    search_query = request.GET.get('search', '').strip()

    all_tags_flat = []
    for art in Articles.objects.filter(is_draft=False):
        all_tags_flat.extend([tag.strip() for tag in art.tags.split(',') if tag.strip()])
    
    tag_counts_list = sorted(Counter(all_tags_flat).items())
    all_tags = sorted(list(set(all_tags_flat)))

    has_drafts = Articles.objects.filter(author=user, is_draft=True).exists() if user else False
    
    queryset = Articles.objects.filter(is_draft=False).select_related('author').order_by('-created_at')

    # Apply the search filter if a query exists
    if search_query:
        queryset = queryset.filter(
            Q(title__icontains=search_query) | Q(content__icontains=search_query)
        )
    
    if user and user.is_authenticated:
        queryset = queryset.annotate(
            is_liked_by_user=Exists(Like.objects.filter(
                article=OuterRef('pk'), 
                user=user
            ))
        )
    
    queryset = queryset.annotate(
        likes_count=Count('like_entries'),
        comments_count=Count('comments')
    )
    
    tag_query = request.GET.get('tag', '').strip()
    if tag_query:
        queryset = queryset.filter(
            Q(tags__iexact=tag_query) |
            Q(tags__icontains=tag_query + ', ') |
            Q(tags__icontains=', ' + tag_query)
        )
    
    paginator = Paginator(queryset, 5)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Process each article to create a 'tags_list' attribute for the template
    for article_obj in page_obj.object_list:
        article_obj.tags_list = [tag.strip() for tag in article_obj.tags.split(',') if tag.strip()]

    context = {
        'user_name': user.username if user else None,
        'is_logged_in': bool(user),
        'tag_counts_list': tag_counts_list,
        'all_tags': all_tags,
        'has_drafts': has_drafts,
        'no_drafts': not has_drafts,
        'tag_query': tag_query,
        'search_query': search_query, # Pass the search query back to the template
        'articles': page_obj.object_list,
        'page_obj': page_obj,
    }
    
    return render(request, 'article.html', context)

# ------------------------------- Add / Edit Article ----------------------------------

@login_required(login_url='login')
def save_article(request, article_id=None):
    user = request.user
    article = get_object_or_404(Articles, id=article_id, author=user) if article_id else None

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            action = data.get('action')
            title = data.get('title')
            content = data.get('content')
            tags = data.get('tags')

            article = get_object_or_404(Articles, id=article_id, author=user) if article_id else None

            if action == 'cancel':
                redirect_to = reverse('draft_article') if article and article.is_draft else reverse('article')
                return JsonResponse({'success': True, 'redirect': redirect_to})

            if action == 'delete' and article:
                article.delete()
                return JsonResponse({"success": True, "message": "Article deleted!", "redirect": reverse('draft_article')})

            is_draft = (action == 'draft')

            if article:
                article.title = title
                article.content = content
                article.tags = tags
                article.is_draft = is_draft
                article.save()
                message = "Draft saved!" if is_draft else "Article updated successfully!"
            else:
                article = Articles.objects.create(
                    title=title,
                    content=content,
                    tags=tags,
                    author=user,
                    is_draft=is_draft
                )
                message = "Draft saved!" if is_draft else "Article published successfully!"
            
            redirect_to = reverse('draft_article') if is_draft else reverse('article')
            return JsonResponse({'success': True, 'message': message, 'redirect': redirect_to})

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
    else: # GET request
        context = {'article': article}
        return render(request, 'add_article.html', context)

# ------------------------------- Draft Articles ----------------------------------

@login_required(login_url='login')
def draft_article(request):
    drafts_qs = Articles.objects.filter(author=request.user, is_draft=True).order_by('-created_at')
    has_drafts = drafts_qs.exists()
    
    processed_drafts = list(drafts_qs.values(
        'id', 'title', 'content', 'tags', 'created_at', 'author__username'
    ))

    context = {
        'articles': processed_drafts,
        'is_logged_in': True,
        'user_name': request.user.username,
        'is_draft_page': True,
        'has_drafts': has_drafts,
        'no_drafts': not has_drafts,
    }
    
    return render(request, 'draft_article.html', context)

# ------------------------------- Tags Redirect ----------------------------------

def tags(request, tag):
    return redirect(reverse('article') + f'?tag={tag}')

# ------------------------------- Like ----------------------------------

@login_required(login_url='login')
def like_article(request, article_id):
    if request.method == 'POST':
        article = get_object_or_404(Articles, id=article_id)
        user = request.user
        
        try:
            like_instance = Like.objects.get(article=article, user=user)
            like_instance.delete()
            is_liked = False
            message = "Unliked"
        except Like.DoesNotExist:
            Like.objects.create(article=article, user=user)
            is_liked = True
            message = "Liked"
        
        # Use the correct related name here
        new_like_count = article.like_entries.count()

        return JsonResponse({
            'success': True,
            'is_liked': is_liked,
            'new_count': new_like_count,
            'message': message
        })
    
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)

def get_likes(request, article_id):
    article = get_object_or_404(Articles, id=article_id)
    likes = article.like_entries.select_related("user").order_by("-created_at")

    likes_data = [
        {
            "username": like.user.username,
            "full_name": like.user.get_full_name() or like.user.username,
            "created_at": like.created_at.strftime("%Y-%m-%d %H:%M"),
        }
        for like in likes
    ]

    return JsonResponse({
        "success": True,
        "likes": likes_data,
        "count": likes.count(),
    })

# ------------------------------- Register ----------------------------------

@login_required(login_url='login')
def add_comment(request, article_id):
    if request.method == 'POST':
        article = get_object_or_404(Articles, id=article_id)
        user = request.user
        
        try:
            data = json.loads(request.body)
            content = data.get('content')
            
            if not content:
                return JsonResponse({'success': False, 'message': 'Comment content cannot be empty.'}, status=400)

            comment = Comment.objects.create(
                article=article,
                user=user,
                content=content
            )
            
            # This related name 'comments' is correct
            new_comment_count = article.comments.count()

            return JsonResponse({
                'success': True,
                'message': 'Comment added successfully.',
                'comment_id': comment.id,
                'new_count': new_comment_count,
                'comment_data': {
                    'author': user.username,
                    'content': content,
                    'created_at': comment.created_at.strftime('%Y-%m-%dT%H:%M:%S')
                }
            })
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
    
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)

def get_comments(request, article_id):
    article = get_object_or_404(Articles, id=article_id)
    comments = Comment.objects.filter(article=article).order_by('created_at').annotate(
        author_username=F('user__username')
    )
    comment_list = [
        {
            'author': comment.author_username,
            'content': comment.content,
            'created_at': comment.created_at.strftime('%Y-%m-%dT%H:%M:%S')
        } for comment in comments
    ]
    return JsonResponse({'success': True, 'comments': comment_list})
